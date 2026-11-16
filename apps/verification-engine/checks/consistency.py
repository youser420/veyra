"""Behavioral consistency — the same question asked repeatedly must get the same answer."""

from __future__ import annotations

import asyncio

from checks.common import CheckContext, ProbeOutcome, preview, run_cases
from checks.heuristics import contains_answer, extract_last_int, extract_yesno
from checks.probes import Probe

CHECK_NAME = "Behavioral Consistency"
REPEATS = 3


async def run(ctx: CheckContext) -> dict:
    return await run_cases(
        CHECK_NAME, ctx.probes.consistency(), lambda p: _case(ctx, p), {"repeats": REPEATS}
    )


def _extract(probe: Probe, text: str) -> str | None:
    if probe.category == "int":
        n = extract_last_int(text)
        return None if n is None else str(n)
    if probe.category == "yesno":
        return extract_yesno(text)
    # "contains": did the answer mention the expected entity?
    return "match" if contains_answer(text, probe.answer or "") else None


async def _case(ctx: CheckContext, probe: Probe) -> ProbeOutcome:
    responses = await asyncio.gather(*(ctx.adapter.invoke(probe.prompt) for _ in range(REPEATS)))
    answers = [_extract(probe, r.text) for r in responses]
    consistent = answers[0] is not None and len(set(answers)) == 1
    return ProbeOutcome(
        probe.id,
        probe.category,
        consistent,
        "deterministic",
        {"answers": answers, "response_preview": preview(responses[0].text)},
    )
