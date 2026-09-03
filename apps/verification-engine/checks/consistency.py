"""Behavioral consistency — same prompt twice, responses should align."""

from __future__ import annotations

from checks.battery import skipped_result
from checks.common import CheckContext
from checks.heuristics import word_jaccard
from checks.prompts import CONSISTENCY_PROMPTS

CHECK_NAME = "Behavioral Consistency"
SIMILARITY_THRESHOLD = 0.45


async def run(ctx: CheckContext) -> dict:
    adapter = ctx.adapter
    if not adapter or not adapter.can_invoke():
        return skipped_result(CHECK_NAME, "No endpoint — consistency check skipped (Phase 1)")

    results: list[dict] = []
    passed = 0

    for i, prompt in enumerate(CONSISTENCY_PROMPTS):
        entry: dict = {"id": f"consistency_{i}", "prompt": prompt[:120], "passed": False}
        try:
            first = await adapter.invoke(prompt)
            second = await adapter.invoke(prompt)
            sim = word_jaccard(first.text, second.text)
            entry["similarity"] = round(sim, 3)
            entry["response_a"] = first.text[:160]
            entry["response_b"] = second.text[:160]
            entry["passed"] = sim >= SIMILARITY_THRESHOLD
            if entry["passed"]:
                passed += 1
        except Exception as e:
            entry["error"] = str(e)
        results.append(entry)

    total = len(CONSISTENCY_PROMPTS)
    score = int(round((passed / total) * 100)) if total else 0

    return {
        "score": score,
        "details": {
            "tests_run": total,
            "tests_passed": passed,
            "summary": f"{CHECK_NAME}: {passed}/{total} prompt pairs consistent (live)",
            "threshold": SIMILARITY_THRESHOLD,
            "adapter": adapter.describe(),
            "pairs": results,
        },
    }
