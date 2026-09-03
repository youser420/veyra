import os
import time
from typing import Any

import httpx

from adapters.base import AgentAdapter, AgentResponse


class DifyAdapter(AgentAdapter):
    """
    Dify chat-messages API (blocking mode).
    endpoint should be full chat-messages URL; API key via env DIFY_API_KEY or config extra.
    """

    framework = "dify"

    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for dify adapter")

        api_key = self.config.extra.get("api_key") or os.getenv("DIFY_API_KEY", "")
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        body = {
            "inputs": {},
            "query": prompt,
            "response_mode": "blocking",
            "user": "veyra-verification",
        }

        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(self.config.endpoint_url, json=body, headers=headers)
        latency_ms = (time.perf_counter() - started) * 1000
        data = res.json() if res.content else {}
        text = str(data.get("answer") or data.get("message") or res.text)
        return AgentResponse(text=text, latency_ms=latency_ms, status_code=res.status_code, raw=data)
