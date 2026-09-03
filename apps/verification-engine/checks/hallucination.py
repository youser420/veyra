"""Hallucination — answers must stay grounded in provided context."""

from __future__ import annotations

from checks.battery import skipped_result
from checks.common import CheckContext
from checks.heuristics import contains_expected
from checks.prompts import GROUNDED_PROBES

CHECK_NAME = "Hallucination Rate"


async def run(ctx: CheckContext) -> dict:
    adapter = ctx.adapter
    if not adapter or not adapter.can_invoke():
        return skipped_result(CHECK_NAME, "No endpoint — hallucination check skipped (Phase 1)")

    results: list[dict] = []
    passed = 0

    for probe_id, context, question, expected in GROUNDED_PROBES:
        prompt = f"{context}\n\n{question}"
        entry: dict = {"id": probe_id, "expected": expected, "passed": False}
        try:
            res = await adapter.invoke(prompt)
            text = res.text
            entry["response_preview"] = text[:200]
            entry["passed"] = contains_expected(text, expected)
            if entry["passed"]:
                passed += 1
        except Exception as e:
            entry["error"] = str(e)
        results.append(entry)

    total = len(GROUNDED_PROBES)
    score = int(round((passed / total) * 100)) if total else 0

    return {
        "score": score,
        "details": {
            "tests_run": total,
            "tests_passed": passed,
            "summary": f"{CHECK_NAME}: {passed}/{total} grounded answers correct (live)",
            "adapter": adapter.describe(),
            "probes": results,
        },
    }
