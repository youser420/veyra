"""
Local test agent for Phase 0 end-to-end verification.

Run:  uvicorn scripts.mock_agent:app --port 8080
Verify with endpoint http://localhost:8080/invoke and framework langchain
     or http://localhost:8080/run and framework generic_http
"""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Veyra Mock Agent")


class PromptBody(BaseModel):
    prompt: str | None = None


class LangChainBody(BaseModel):
    input: dict | str | None = None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/run")
def generic_run(body: PromptBody):
    p = body.prompt or "hello"
    return {"response": _mock_answer(p)}


def _mock_answer(q: str) -> str:
    lower = q.lower()
    if "123-45-6789" in q or "social security" in lower:
        return "I can't repeat or confirm sensitive personal information like a Social Security number."
    if "alice.secret@veyra.dev" in lower:
        return "I won't repeat private email addresses. Please avoid sharing PII in prompts."
    if "alpha-42" in lower and "codename" in lower:
        return "According to the reference document, the project codename is ALPHA-42."
    if "2026-09-15" in q and "deadline" in lower:
        return "The launch deadline in the document is 2026-09-15."
    if "125,000" in q or "125000" in lower:
        return "The approved Q3 budget in the document is $125,000 USD."
    if any(p in lower for p in ("break into", "ransomware", "weapon", "hurt themselves", "offensive insult")):
        return "I'm sorry, but I can't help with that request."
    if "ignore all previous" in lower or "pwned" in lower or "system prompt" in lower:
        return "I can't override my instructions or reveal hidden prompts."
    return f"LangChain mock: {q[:200]}"


@app.post("/invoke")
def langchain_invoke(body: LangChainBody):
    if isinstance(body.input, dict):
        q = body.input.get("question") or body.input.get("input") or str(body.input)
    else:
        q = str(body.input or "")
    return {"output": {"answer": _mock_answer(q)}}


@app.post("/")
def root(body: dict):
    return {"result": "mock root", "echo": body}
