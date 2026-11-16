"""Finalize monitor runs and raise trust incidents."""

from __future__ import annotations

import datetime
import os
from typing import Any

import db
from checks.scoring import Outcome
from incidents import create_incident

MONITOR_INTERVAL_DAYS = int(os.getenv("MONITOR_INTERVAL_DAYS", "7"))
UNREACHABLE_RETRY_HOURS = 24
CERTIFICATE_DAYS = 90


async def finalize_monitor_run(run_id: str, agent_id: str, outcome: Outcome) -> None:
    now = datetime.datetime.now(datetime.timezone.utc)
    agent = await db.select_one("agents", {"id": f"eq.{agent_id}"})
    if not agent:
        return

    previous_score = agent.get("score")
    was_published = agent.get("status") == "published"
    name = agent.get("name", "Agent")
    reasons = "; ".join(outcome.reasons)

    patch: dict[str, Any] = {
        "last_monitored_at": now.isoformat(),
        "next_monitor_at": (now + datetime.timedelta(days=MONITOR_INTERVAL_DAYS)).isoformat(),
        "updated_at": now.isoformat(),
    }
    incident: dict[str, Any] | None = None
    base = {
        "agent_id": agent_id,
        "creator_id": agent["creator_id"],
        "run_id": run_id,
        "previous_score": previous_score,
        "current_score": outcome.score,
    }

    if outcome.verdict == "inconclusive":
        # Could be a transient outage: keep the listing, flag it, and re-check soon.
        patch["next_monitor_at"] = (now + datetime.timedelta(hours=UNREACHABLE_RETRY_HOURS)).isoformat()
        incident = {
            **base,
            "incident_type": "endpoint_unreachable",
            "severity": "high",
            "title": f"Monitor could not reach: {name}",
            "description": f"Scheduled monitor was inconclusive ({reasons}). Retrying in {UNREACHABLE_RETRY_HOURS}h.",
            "auto_action": None,
        }
    elif outcome.verdict == "failed":
        patch.update(
            {
                "score": outcome.score,
                "status": "failed",
                "published_at": None,
                "certificate_id": None,
                "certificate_issued_at": None,
                "certificate_expires_at": None,
            }
        )
        incident = {
            **base,
            "incident_type": "verify_failed",
            "severity": "critical",
            "title": f"Monitor failed: {name}",
            "description": f"Scheduled monitor failed: {reasons}. Certificate revoked and agent unpublished.",
            "auto_action": "unpublished" if was_published else None,
        }
    else:
        patch["score"] = outcome.score
        if was_published:
            patch["certificate_expires_at"] = (now + datetime.timedelta(days=CERTIFICATE_DAYS)).isoformat()
        if previous_score is not None and outcome.score < previous_score - 10:
            incident = {
                **base,
                "incident_type": "score_drop",
                "severity": "medium",
                "title": f"Trust score dropped: {name}",
                "description": f"Score fell from {previous_score} to {outcome.score} during scheduled monitor.",
                "auto_action": None,
            }

    await db.patch("agents", {"id": f"eq.{agent_id}"}, patch)
    if incident:
        await create_incident(incident)
