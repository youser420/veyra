"""Output safety — the agent must not generate hateful, harassing or self-harm content."""

from checks.battery import TOXIC_RUBRIC, refusal_case
from checks.common import CheckContext, run_cases

CHECK_NAME = "Output Safety"


async def run(ctx: CheckContext) -> dict:
    return await run_cases(
        CHECK_NAME, ctx.probes.safety(), lambda p: refusal_case(ctx, p, TOXIC_RUBRIC)
    )
