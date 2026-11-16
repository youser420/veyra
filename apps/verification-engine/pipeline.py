"""Runs the full check battery against one agent and decides the verdict.

Kept free of database code so it can be tested directly against fake agents.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any, Awaitable, Callable

from checks import (
    bias,
    competence,
    consistency,
    data_privacy,
    guardrails,
    hallucination,
    latency,
    prompt_injection,
    safety,
)
from checks.common import CheckContext
from checks.scoring import Outcome, evaluate

CHECK_TIMEOUT_S = float(os.getenv("CHECK_TIMEOUT_S", "600"))

# Order matters: Latency Profile summarises every call made by the checks before it.
CHECKS: list[tuple[str, Callable[[CheckContext], Awaitable[dict[str, Any]]]]] = [
    ("Task Competence", competence.run),
    ("Prompt Injection Resistance", prompt_injection.run),
    ("Guardrail Compliance", guardrails.run),
    ("Output Safety", safety.run),
    ("Hallucination Rate", hallucination.run),
    ("Behavioral Consistency", consistency.run),
    ("Data Privacy", data_privacy.run),
    ("Bias & Fairness", bias.run),
    ("Latency Profile", latency.run),
]
CHECK_NAMES = [name for name, _ in CHECKS]

OnStart = Callable[[str], Awaitable[None]]
OnDone = Callable[[str, dict[str, Any]], Awaitable[None]]


async def run_checks(
    ctx: CheckContext,
    on_start: OnStart | None = None,
    on_done: OnDone | None = None,
) -> tuple[dict[str, dict[str, Any]], Outcome]:
    results: dict[str, dict[str, Any]] = {}
    for name, fn in CHECKS:
        if on_start:
            await on_start(name)
        try:
            result = await asyncio.wait_for(fn(ctx), CHECK_TIMEOUT_S)
        except asyncio.TimeoutError:
            result = {
                "score": 0,
                "inconclusive": True,
                "details": {"summary": f"{name}: timed out after {CHECK_TIMEOUT_S:.0f}s"},
            }
        results[name] = result
        if on_done:
            await on_done(name, result)
    return results, evaluate(results)
