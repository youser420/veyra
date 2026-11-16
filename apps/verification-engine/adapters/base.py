from __future__ import annotations

import asyncio
import json as jsonlib
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import httpx

from security import validate_endpoint

CALL_TIMEOUT_S = float(os.getenv("AGENT_CALL_TIMEOUT_S", "60"))
MAX_CONCURRENCY = int(os.getenv("AGENT_MAX_CONCURRENCY", "3"))
MAX_RESPONSE_BYTES = 256_000


@dataclass
class AdapterConfig:
    framework: str
    endpoint_url: str | None = None
    config_file_path: str | None = None
    submission_method: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResponse:
    text: str
    latency_ms: float
    status_code: int
    raw: dict[str, Any] = field(default_factory=dict)


class AgentCallError(RuntimeError):
    """The agent could not be reached or returned a server error."""


@dataclass
class HttpResult:
    status_code: int
    headers: httpx.Headers
    content: bytes

    @property
    def text(self) -> str:
        return self.content.decode("utf-8", errors="replace")

    def json(self) -> Any:
        return jsonlib.loads(self.content)

    def is_json(self) -> bool:
        return "json" in self.headers.get("content-type", "")


@dataclass
class CallStats:
    """Every call made during a run, used by the reliability/latency check."""

    latencies_ms: list[float] = field(default_factory=list)
    ok: int = 0
    errors: int = 0

    @property
    def total(self) -> int:
        return self.ok + self.errors


class AgentAdapter(ABC):
    """Normalizes how verification checks invoke an agent.

    Subclasses implement `_invoke`; callers use `invoke`, which adds the timeout,
    concurrency cap, latency measurement and error accounting.
    """

    framework: str = "generic"

    def __init__(self, config: AdapterConfig):
        self.config = config
        self.stats = CallStats()
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        self._client: httpx.AsyncClient | None = None

    @abstractmethod
    async def _invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        ...

    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        async with self._semaphore:
            started = time.perf_counter()
            try:
                res = await asyncio.wait_for(self._invoke(prompt, **kwargs), CALL_TIMEOUT_S)
            except asyncio.TimeoutError as e:
                self.stats.errors += 1
                raise AgentCallError(f"Timed out after {CALL_TIMEOUT_S:.0f}s") from e
            except AgentCallError:
                self.stats.errors += 1
                raise
            except Exception as e:
                self.stats.errors += 1
                raise AgentCallError(f"{type(e).__name__}: {e}") from e

            res.latency_ms = (time.perf_counter() - started) * 1000
            if res.status_code >= 500:
                self.stats.errors += 1
                raise AgentCallError(f"Agent returned HTTP {res.status_code}")
            self.stats.ok += 1
            self.stats.latencies_ms.append(res.latency_ms)
            return res

    async def _post(
        self,
        url: str,
        body: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> HttpResult:
        """POST to a seller endpoint: SSRF-checked, no redirects, capped response size."""
        await validate_endpoint(url)
        if self._client is None:
            # One client per run: building one per call costs ~1s on Windows (SSL context)
            # and would be counted as agent latency.
            self._client = httpx.AsyncClient(timeout=CALL_TIMEOUT_S, follow_redirects=False)
        async with self._client.stream("POST", url, json=body, headers=headers) as res:
            chunks: list[bytes] = []
            size = 0
            async for chunk in res.aiter_bytes():
                size += len(chunk)
                if size > MAX_RESPONSE_BYTES:
                    raise AgentCallError(f"Response exceeded {MAX_RESPONSE_BYTES} bytes")
                chunks.append(chunk)
            return HttpResult(res.status_code, res.headers, b"".join(chunks))

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def can_invoke(self) -> bool:
        return bool(self.config.endpoint_url)

    def describe(self) -> dict[str, Any]:
        return {
            "framework": self.framework,
            "submission_method": self.config.submission_method,
            "can_invoke": self.can_invoke(),
        }
