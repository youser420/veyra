from typing import Any

from adapters.base import AgentAdapter, AgentCallError, AgentResponse


class AutoGenAdapter(AgentAdapter):
    """AutoGen Studio / proxy: POST { "message": "..." } or OpenAI-style chat."""

    framework = "autogen"

    async def _invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for autogen adapter")

        bodies = [
            {"message": prompt},
            {"messages": [{"role": "user", "content": prompt}]},
        ]
        for body in bodies:
            res = await self._post(self.config.endpoint_url, body)
            if res.status_code < 500 and res.status_code != 422:
                text = res.text
                if res.is_json():
                    data = res.json()
                    if isinstance(data, dict):
                        text = str(
                            data.get("response")
                            or data.get("content")
                            or (data.get("choices") or [{}])[0]
                            .get("message", {})
                            .get("content", data)
                        )
                return AgentResponse(text=text, latency_ms=0.0, status_code=res.status_code)
        raise AgentCallError("AutoGen adapter: no successful response shape")
