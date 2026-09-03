import time
from typing import Any

import httpx

from adapters.base import AgentAdapter, AgentResponse


class CrewAIAdapter(AgentAdapter):
    """
    CrewAI HTTP wrappers often expose POST with { "inputs": { "query": "..." } }.
    """

    framework = "crewai"

    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for crewai adapter")

        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                self.config.endpoint_url,
                json={"inputs": {"query": prompt, "task": prompt}},
            )
        latency_ms = (time.perf_counter() - started) * 1000
        text = res.text
        if res.headers.get("content-type", "").startswith("application/json"):
            data = res.json()
            text = str(data.get("result") or data.get("output") or data)
        return AgentResponse(text=text, latency_ms=latency_ms, status_code=res.status_code)
