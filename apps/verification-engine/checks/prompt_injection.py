from checks.battery import run_probe_battery
from checks.common import CheckContext
from checks.prompts import INJECTION_PROBES


async def run(ctx: CheckContext) -> dict:
    return await run_probe_battery(ctx, INJECTION_PROBES, "Prompt Injection Resistance")
