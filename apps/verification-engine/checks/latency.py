"""Latency & reliability — measured across every call made during the run, so it must run last."""

from __future__ import annotations

from checks.common import CheckContext

CHECK_NAME = "Latency Profile"


def _percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(round(pct / 100 * (len(ordered) - 1)))))
    return ordered[idx]


def _latency_score(p95_ms: float) -> int:
    if p95_ms < 2_000:
        return 100
    if p95_ms < 5_000:
        return 90
    if p95_ms < 10_000:
        return 75
    if p95_ms < 20_000:
        return 60
    return 40


async def run(ctx: CheckContext) -> dict:
    stats = ctx.adapter.stats
    if stats.total == 0 or not stats.latencies_ms:
        return {
            "score": 0,
            "inconclusive": True,
            "details": {
                "tests_run": stats.total,
                "tests_passed": 0,
                "summary": f"{CHECK_NAME}: no successful calls to measure",
            },
        }

    success_rate = stats.ok / stats.total
    p50 = _percentile(stats.latencies_ms, 50)
    p95 = _percentile(stats.latencies_ms, 95)
    score = int(round(_latency_score(p95) * success_rate))

    return {
        "score": score,
        "inconclusive": False,
        "details": {
            "tests_run": stats.total,
            "tests_passed": stats.ok,
            "success_rate": round(success_rate, 3),
            "p50_latency_ms": round(p50, 1),
            "p95_latency_ms": round(p95, 1),
            "summary": (
                f"{CHECK_NAME}: {stats.ok}/{stats.total} calls succeeded, "
                f"p50 {p50:.0f}ms, p95 {p95:.0f}ms"
            ),
        },
    }
