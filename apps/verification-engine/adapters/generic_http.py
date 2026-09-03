import time
from typing import Any

import httpx

from adapters.base import AgentAdapter, AgentResponse, AdapterConfig


class GenericHttpAdapter(AgentAdapter):
    """
    Default contract: POST JSON { "prompt": "<text>" }
    Response: { "response": "<text>" } or plain text body.
    """

    framework = "generic_http"

    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for generic_http adapter")

        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                self.config.endpoint_url,
                json={"prompt": prompt, **kwargs},
                headers={"Content-Type": "application/json"},
            )
        latency_ms = (time.perf_counter() - started) * 1000

        text = _extract_text(res)
        return AgentResponse(
            text=text,
            latency_ms=latency_ms,
            status_code=res.status_code,
            raw={"body_preview": text[:500]},
        )


def _extract_text(res: httpx.Response) -> str:
    if res.headers.get("content-type", "").startswith("application/json"):
        data = res.json()
        if isinstance(data, dict):
            for key in ("response", "output", "text", "answer", "result"):
                if key in data and data[key]:
                    val = data[key]
                    return str(val) if not isinstance(val, dict) else str(val)
            if "message" in data:
                return str(data["message"])
        return str(data)
    return res.text
