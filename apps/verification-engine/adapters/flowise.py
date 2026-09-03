import time
from typing import Any

import httpx

from adapters.base import AgentAdapter, AgentResponse


class FlowiseAdapter(AgentAdapter):
    """
    Flowise prediction API:
    POST {endpoint}  { "question": "..." }
    """

    framework = "flowise"

    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for flowise adapter")

        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=90.0) as client:
            res = await client.post(
                self.config.endpoint_url,
                json={"question": prompt, "overrideConfig": kwargs.get("overrideConfig", {})},
            )
        latency_ms = (time.perf_counter() - started) * 1000
        text = res.text
        if "json" in res.headers.get("content-type", ""):
            data = res.json()
            text = str(data.get("text") or data.get("answer") or data)
        return AgentResponse(text=text, latency_ms=latency_ms, status_code=res.status_code)
