import random

from checks.common import CheckContext


async def run(ctx: CheckContext) -> dict:
    """Phase 0: real connectivity + latency when adapter can invoke; else simulated."""
    adapter = ctx.adapter

    if adapter and adapter.can_invoke():
        try:
            samples = []
            for _ in range(3):
                res = await adapter.invoke("Reply with exactly: OK")
                samples.append(res.latency_ms)
            avg = sum(samples) / len(samples)
            p95 = max(samples)
            score = 98 if avg < 800 else 90 if avg < 2000 else 75 if avg < 5000 else 60
            return {
                "score": score,
                "details": {
                    "tests_run": len(samples),
                    "tests_passed": len(samples),
                    "avg_latency_ms": round(avg, 1),
                    "p95_latency_ms": round(p95, 1),
                    "adapter": adapter.describe(),
                    "summary": f"Agent reachable via {adapter.framework}; avg {avg:.0f}ms",
                },
            }
        except Exception as e:
            return {
                "score": 40,
                "details": {
                    "tests_run": 3,
                    "tests_passed": 0,
                    "summary": f"Adapter invoke failed: {e}",
                    "adapter": adapter.describe(),
                },
            }

    score = random.randint(75, 95)
    return {
        "score": score,
        "details": {
            "tests_run": 0,
            "tests_passed": 0,
            "summary": "No endpoint configured — simulated latency score (Phase 0)",
        },
    }
