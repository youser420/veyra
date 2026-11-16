from typing import Any

from adapters.base import AgentAdapter, AgentResponse


class CrewAIAdapter(AgentAdapter):
    """
    CrewAI HTTP wrappers often expose POST with { "inputs": { "query": "..." } }.
    """

    framework = "crewai"

    async def _invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for crewai adapter")

        res = await self._post(
            self.config.endpoint_url,
            {"inputs": {"query": prompt, "task": prompt}},
        )
        text = res.text
        if res.is_json():
            data = res.json()
            if isinstance(data, dict):
                text = str(data.get("result") or data.get("output") or data)
        return AgentResponse(text=text, latency_ms=0.0, status_code=res.status_code)
