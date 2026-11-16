from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from adapters.base import AgentAdapter, AgentCallError
from checks.probes import Probe, ProbeFactory
from judge import Judge

# A check whose probes mostly failed to reach the agent can't be scored honestly.
INCONCLUSIVE_ERROR_RATE = 0.25
PREVIEW_CHARS = 240


@dataclass
class CheckContext:
    adapter: AgentAdapter
    probes: ProbeFactory
    judge: Judge = field(default_factory=Judge)
    category: str | None = None  # marketplace category; picks the competence task pool
    agent_config: dict[str, Any] | None = None


@dataclass
class ProbeOutcome:
    id: str
    category: str
    passed: bool | None  # None = agent unreachable for this probe
    method: str  # deterministic | llm_judge | heuristic | error
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "category": self.category,
            "passed": self.passed,
            "method": self.method,
            **self.detail,
        }


def preview(text: str) -> str:
    return text[:PREVIEW_CHARS]


async def judged(
    ctx: CheckContext,
    rubric: str,
    prompt: str,
    response: str,
    heuristic: Callable[[], bool],
) -> tuple[bool, str, str | None]:
    """Ask the judge; fall back to the heuristic. Returns (passed, method, reason)."""
    verdict = await ctx.judge.evaluate(rubric, prompt, response)
    if verdict is not None:
        return verdict.passed, "llm_judge", verdict.reason
    return heuristic(), "heuristic", None


async def run_cases(
    check_name: str,
    probes: list[Probe],
    case: Callable[[Probe], Awaitable[ProbeOutcome]],
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    async def guarded(probe: Probe) -> ProbeOutcome:
        try:
            return await case(probe)
        except AgentCallError as e:
            return ProbeOutcome(probe.id, probe.category, None, "error", {"error": str(e)[:300]})

    outcomes = await asyncio.gather(*(guarded(p) for p in probes))
    return summarize(check_name, outcomes, extra)


def summarize(
    check_name: str,
    outcomes: list[ProbeOutcome],
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    total = len(outcomes)
    errored = sum(1 for o in outcomes if o.passed is None)
    scored = total - errored
    passed = sum(1 for o in outcomes if o.passed)
    inconclusive = scored == 0 or errored / total > INCONCLUSIVE_ERROR_RATE
    score = int(round(passed / scored * 100)) if scored else 0
    summary = (
        f"{check_name}: {passed}/{scored} probes passed"
        + (f", {errored} unreachable" if errored else "")
        + (" — inconclusive" if inconclusive else "")
    )
    return {
        "score": score,
        "inconclusive": inconclusive,
        "details": {
            "tests_run": total,
            "tests_passed": passed,
            "tests_errored": errored,
            "summary": summary,
            "probes": [o.to_dict() for o in outcomes],
            **(extra or {}),
        },
    }
