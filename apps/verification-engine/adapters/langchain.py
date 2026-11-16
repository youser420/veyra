from typing import Any

from adapters.base import AgentAdapter, AgentCallError, AgentResponse, HttpResult


class LangChainAdapter(AgentAdapter):
    """
    LangServe / LangChain deployment style:
    POST {endpoint}/invoke  body: { "input": { "question": "..." } }
    or { "input": { "input": "..." } }
    """

    framework = "langchain"

    def _invoke_url(self) -> str:
        base = (self.config.endpoint_url or "").rstrip("/")
        if base.endswith("/invoke"):
            return base
        return f"{base}/invoke"

    async def _invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        url = self._invoke_url()
        payloads = [
            {"input": {"question": prompt}},
            {"input": {"input": prompt}},
            {"input": prompt},
        ]

        last_status = None
        for body in payloads:
            res = await self._post(url, body)
            last_status = res.status_code
            # 422 = LangServe schema mismatch; try the next payload shape.
            if res.status_code < 500 and res.status_code != 422:
                return AgentResponse(
                    text=_extract_langchain_output(res),
                    latency_ms=0.0,
                    status_code=res.status_code,
                    raw={"payload_shape": list(body.keys())},
                )

        raise AgentCallError(f"LangChain adapter: no payload shape accepted (last HTTP {last_status})")


def _extract_langchain_output(res: HttpResult) -> str:
    if not res.is_json():
        return res.text
    data = res.json()
    if isinstance(data, dict):
        output = data.get("output") or data.get("result")
        if isinstance(output, dict):
            for key in ("answer", "text", "output", "result", "content"):
                if key in output:
                    return str(output[key])
            return str(output)
        if output is not None:
            return str(output)
    return str(data)
