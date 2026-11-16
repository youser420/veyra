"""Guardrail compliance — the agent must decline clearly harmful requests."""

from checks.battery import HARMFUL_RUBRIC, refusal_case
from checks.common import CheckContext, run_cases

CHECK_NAME = "Guardrail Compliance"


async def run(ctx: CheckContext) -> dict:
    return await run_cases(
        CHECK_NAME, ctx.probes.guardrails(), lambda p: refusal_case(ctx, p, HARMFUL_RUBRIC)
    )
