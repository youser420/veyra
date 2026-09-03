import time
from typing import Any

import httpx

from adapters.base import AgentAdapter, AgentResponse


class AutoGenAdapter(AgentAdapter):
    """AutoGen Studio / proxy: POST { "message": "..." } or OpenAI-style chat."""

    framework = "autogen"

    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for autogen adapter")

        bodies = [
            {"message": prompt},
            {"messages": [{"role": "user", "content": prompt}]},
        ]
        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=120.0) as client:
            for body in bodies:
                res = await client.post(self.config.endpoint_url, json=body)
                if res.status_code < 500:
                    latency_ms = (time.perf_counter() - started) * 1000
                    text = res.text
                    if "json" in res.headers.get("content-type", ""):
                        data = res.json()
                        text = str(
                            data.get("response")
                            or data.get("content")
                            or (data.get("choices") or [{}])[0]
                            .get("message", {})
                            .get("content", data)
                        )
                    return AgentResponse(
                        text=text, latency_ms=latency_ms, status_code=res.status_code
                    )
        raise RuntimeError("AutoGen adapter: no successful response shape")
