import os
from typing import Any

from adapters.base import AgentAdapter, AgentResponse


class DifyAdapter(AgentAdapter):
    """
    Dify chat-messages API (blocking mode).
    endpoint should be full chat-messages URL; API key via env DIFY_API_KEY or config extra.
    """

    framework = "dify"

    async def _invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
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

        res = await self._post(self.config.endpoint_url, body, headers=headers)
        data = res.json() if res.content and res.is_json() else {}
        text = str(data.get("answer") or data.get("message") or res.text)
        return AgentResponse(text=text, latency_ms=0.0, status_code=res.status_code)
