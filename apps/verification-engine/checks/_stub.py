import random

from checks.common import CheckContext


async def stub_check(ctx: CheckContext, check_name: str) -> dict:
    # TODO Phase 1: replace with real check using ctx.adapter
    score = random.randint(75, 98)
    adapter_info = ctx.adapter.describe() if ctx.adapter else {}
    return {
        "score": score,
        "details": {
            "tests_run": 240,
            "tests_passed": int(240 * score / 100),
            "summary": f"{check_name}: simulated (Phase 0). Adapter: {adapter_info.get('framework', 'none')}",
            "adapter": adapter_info,
        },
    }
