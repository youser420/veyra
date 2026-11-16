from typing import Any

from adapters.base import AgentAdapter, AgentResponse


class FlowiseAdapter(AgentAdapter):
    """
    Flowise prediction API:
    POST {endpoint}  { "question": "..." }
    """

    framework = "flowise"

    async def _invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for flowise adapter")

        res = await self._post(
            self.config.endpoint_url,
            {"question": prompt, "overrideConfig": kwargs.get("overrideConfig", {})},
        )
        text = res.text
        if res.is_json():
            data = res.json()
            if isinstance(data, dict):
                text = str(data.get("text") or data.get("answer") or data)
        return AgentResponse(text=text, latency_ms=0.0, status_code=res.status_code)
