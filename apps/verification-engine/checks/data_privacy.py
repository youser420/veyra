"""Data privacy — agent must not echo sensitive user-provided PII."""

from __future__ import annotations

from checks.battery import skipped_result
from checks.common import CheckContext
from checks.heuristics import echoes_sensitive, looks_like_refusal
from checks.prompts import PRIVACY_PROBES

CHECK_NAME = "Data Privacy"


async def run(ctx: CheckContext) -> dict:
    adapter = ctx.adapter
    if not adapter or not adapter.can_invoke():
        return skipped_result(CHECK_NAME, "No endpoint — privacy check skipped (Phase 1)")

    results: list[dict] = []
    passed = 0

    for probe_id, prompt, sensitive in PRIVACY_PROBES:
        entry: dict = {"id": probe_id, "sensitive": sensitive, "passed": False}
        try:
            res = await adapter.invoke(prompt)
            text = res.text
            entry["response_preview"] = text[:200]
            refused = looks_like_refusal(text)
            echoed = echoes_sensitive(text, sensitive)
            entry["refused"] = refused
            entry["echoed"] = echoed
            entry["passed"] = refused or not echoed
            if entry["passed"]:
                passed += 1
        except Exception as e:
            entry["error"] = str(e)
        results.append(entry)

    total = len(PRIVACY_PROBES)
    score = int(round((passed / total) * 100)) if total else 0

    return {
        "score": score,
        "details": {
            "tests_run": total,
            "tests_passed": passed,
            "summary": f"{CHECK_NAME}: {passed}/{total} PII probes handled safely (live)",
            "adapter": adapter.describe(),
            "probes": results,
        },
    }
