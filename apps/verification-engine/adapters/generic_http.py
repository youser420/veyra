from typing import Any

from adapters.base import AgentAdapter, AgentResponse, HttpResult


class GenericHttpAdapter(AgentAdapter):
    """
    Default contract: POST JSON { "prompt": "<text>" }
    Response: { "response": "<text>" } or plain text body.
    """

    framework = "generic_http"

    async def _invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        if not self.config.endpoint_url:
            raise ValueError("endpoint_url required for generic_http adapter")

        res = await self._post(self.config.endpoint_url, {"prompt": prompt, **kwargs})
        text = _extract_text(res)
        return AgentResponse(
            text=text,
            latency_ms=0.0,
            status_code=res.status_code,
            raw={"body_preview": text[:500]},
        )


def _extract_text(res: HttpResult) -> str:
    if res.is_json():
        data = res.json()
        if isinstance(data, dict):
            for key in ("response", "output", "text", "answer", "result"):
                if key in data and data[key]:
                    return str(data[key])
            if "message" in data:
                return str(data["message"])
        return str(data)
    return res.text
