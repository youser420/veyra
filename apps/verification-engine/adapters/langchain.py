import time
from typing import Any

import httpx

from adapters.base import AgentAdapter, AgentResponse, AdapterConfig


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

    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        url = self._invoke_url()
        payloads = [
            {"input": {"question": prompt}},
            {"input": {"input": prompt}},
            {"input": prompt},
        ]

        started = time.perf_counter()
        last_error: Exception | None = None

        async with httpx.AsyncClient(timeout=90.0) as client:
            for body in payloads:
                try:
                    res = await client.post(url, json=body)
                    if res.status_code < 500:
                        latency_ms = (time.perf_counter() - started) * 1000
                        return AgentResponse(
                            text=_extract_langchain_output(res),
                            latency_ms=latency_ms,
                            status_code=res.status_code,
                            raw={"invoke_url": url, "payload_shape": list(body.keys())},
                        )
                except Exception as e:
                    last_error = e

        raise RuntimeError(f"LangChain adapter failed: {last_error}")


def _extract_langchain_output(res: httpx.Response) -> str:
    data = res.json()
    if isinstance(data, dict):
        output = data.get("output") or data.get("result")
        if isinstance(output, dict):
            for key in ("question", "answer", "text", "output", "result"):
                if key in output:
                    return str(output[key])
            return str(output)
        if output is not None:
            return str(output)
    return str(data)
