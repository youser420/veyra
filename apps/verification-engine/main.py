from dotenv import load_dotenv

load_dotenv()

import datetime
import hmac
import logging
import os
from typing import Any

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel

import db
from adapters import get_adapter
from checks.common import CheckContext
from checks.domains import resolve_category
from checks.probes import PROBE_SET_VERSION, ProbeFactory
from checks.scoring import Outcome, check_passed
from config_loader import load_agent_config
from judge import Judge, get_judge
from pipeline import CHECK_NAMES, run_checks
from security import UnsafeEndpointError, validate_endpoint

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("veyra.engine")

app = FastAPI(title="Veyra Verification Engine")

ENGINE_SECRET = os.getenv("VERIFICATION_ENGINE_SECRET")
CERTIFICATE_DAYS = 90


class VerifyRequest(BaseModel):
    run_id: str
    agent_id: str
    endpoint_url: str | None = None
    config_file_path: str | None = None
    framework: str = "generic_http"
    submission_method: str | None = None
    category: str | None = None
    run_type: str = "verification"


@app.get("/health")
async def health():
    from adapters.registry import list_frameworks

    return {
        "status": "ok",
        "frameworks": list_frameworks(),
        "probe_set_version": PROBE_SET_VERSION,
        "judge": get_judge().mode,
    }


@app.post("/verify")
async def verify(
    req: VerifyRequest,
    background_tasks: BackgroundTasks,
    x_engine_secret: str | None = Header(None),
):
    if not ENGINE_SECRET:
        log.error("VERIFICATION_ENGINE_SECRET is not set — refusing all requests")
        raise HTTPException(status_code=503, detail="Engine not configured")
    if not x_engine_secret or not hmac.compare_digest(
        x_engine_secret.encode(), ENGINE_SECRET.encode()
    ):
        raise HTTPException(status_code=401)
    background_tasks.add_task(run_verification, req)
    return {"status": "queued", "framework": req.framework}


async def run_verification(req: VerifyRequest) -> None:
    try:
        await _run(req)
    except Exception:
        log.exception("verification run %s crashed", req.run_id)
        await _mark_errored(req, "Internal verification error — the run was not scored.")


async def _run(req: VerifyRequest) -> None:
    await db.patch(
        "verification_runs",
        {"id": f"eq.{req.run_id}"},
        {
            "snapshot_framework": req.framework,
            "snapshot_endpoint_url": req.endpoint_url,
            "snapshot_config_path": req.config_file_path,
            "submission_method": req.submission_method,
        },
    )

    adapter = get_adapter(
        framework=req.framework,
        endpoint_url=req.endpoint_url,
        config_file_path=req.config_file_path,
        submission_method=req.submission_method,
    )
    if not adapter.can_invoke():
        await _finish_unverifiable(
            req, "No live endpoint. Behavioural verification needs a reachable agent endpoint."
        )
        return
    try:
        await validate_endpoint(adapter.config.endpoint_url or "")
    except UnsafeEndpointError as e:
        await _finish_unverifiable(req, f"Endpoint rejected: {e}")
        return

    factory = ProbeFactory()
    judge = get_judge()
    category = req.category or await _agent_category(req.agent_id)
    ctx = CheckContext(
        adapter=adapter,
        probes=factory,
        judge=judge,
        category=category,
        agent_config=await load_agent_config(req.config_file_path),
    )
    log.info(
        "run %s: seed=%s judge=%s category=%s",
        req.run_id, factory.seed, judge.mode, resolve_category(category),
    )

    async def on_start(name: str) -> None:
        await _patch_check(req.run_id, name, {"status": "running"})

    async def on_done(name: str, result: dict[str, Any]) -> None:
        await _patch_check(
            req.run_id,
            name,
            {
                "status": "passed" if check_passed(name, result) else "failed",
                "score": result["score"],
                "details": {**result["details"], "inconclusive": result.get("inconclusive", False)},
                "completed_at": _now().isoformat(),
            },
        )

    try:
        _, outcome = await run_checks(ctx, on_start, on_done)
    finally:
        await adapter.aclose()
    await _finalize(req, outcome, factory.seed, judge, resolve_category(category))


async def _agent_category(agent_id: str) -> str | None:
    """Fallback for callers that don't send the category (older web deploys)."""
    agent = await db.select_one("agents", {"id": f"eq.{agent_id}"})
    return agent.get("category") if agent else None


async def _finish_unverifiable(req: VerifyRequest, reason: str) -> None:
    for name in CHECK_NAMES:
        await _patch_check(
            req.run_id,
            name,
            {
                "status": "failed",
                "score": 0,
                "details": {"summary": reason, "inconclusive": True},
                "completed_at": _now().isoformat(),
            },
        )
    await _finalize(req, Outcome(0, "inconclusive", (reason,)), None, None, None)


async def _finalize(
    req: VerifyRequest,
    outcome: Outcome,
    seed: int | None,
    judge: Judge | None,
    category: str | None,
) -> None:
    log.info("run %s: verdict=%s score=%s %s", req.run_id, outcome.verdict, outcome.score, outcome.reasons)
    now = _now()
    await db.patch(
        "verification_runs",
        {"id": f"eq.{req.run_id}"},
        {"status": "completed", "final_score": outcome.score, "completed_at": now.isoformat()},
    )
    # Separate write so an un-migrated database (no 008) still records the core result.
    await db.patch(
        "verification_runs",
        {"id": f"eq.{req.run_id}"},
        {
            "verdict": outcome.verdict,
            "summary": {
                "reasons": list(outcome.reasons),
                "probe_set_version": PROBE_SET_VERSION,
                "competence_category": category,
                "seed": str(seed) if seed is not None else None,
                "judge_mode": judge.mode if judge else None,
                "judge_model": judge.model if judge else None,
            },
        },
    )

    if req.run_type == "monitor":
        from monitor import finalize_monitor_run

        await finalize_monitor_run(req.run_id, req.agent_id, outcome)
        return

    if outcome.verified:
        agent_patch = {
            "status": "verified",
            "score": outcome.score,
            "certificate_id": f"VCT-{req.run_id[:8].upper()}",
            "certificate_issued_at": now.isoformat(),
            "certificate_expires_at": (now + datetime.timedelta(days=CERTIFICATE_DAYS)).isoformat(),
        }
    else:
        agent_patch = {"status": "failed", "score": outcome.score, **_REVOKED_CERTIFICATE}
    await db.patch(
        "agents", {"id": f"eq.{req.agent_id}"}, {**agent_patch, "updated_at": now.isoformat()}
    )


_REVOKED_CERTIFICATE = {
    "certificate_id": None,
    "certificate_issued_at": None,
    "certificate_expires_at": None,
    "published_at": None,
}


async def _mark_errored(req: VerifyRequest, reason: str) -> None:
    now = _now().isoformat()
    await db.patch(
        "check_results",
        {"run_id": f"eq.{req.run_id}", "status": "in.(pending,running)"},
        {"status": "failed", "details": {"summary": reason, "inconclusive": True}, "completed_at": now},
    )
    await db.patch(
        "verification_runs",
        {"id": f"eq.{req.run_id}"},
        {"status": "failed", "completed_at": now},
    )
    await db.patch(
        "verification_runs",
        {"id": f"eq.{req.run_id}"},
        {"verdict": "error", "summary": {"reasons": [reason]}},
    )
    if req.run_type != "monitor":
        # Don't leave the agent stuck in "verifying"; the creator can re-run.
        await db.patch(
            "agents", {"id": f"eq.{req.agent_id}"}, {"status": "failed", "updated_at": now}
        )


async def _patch_check(run_id: str, name: str, body: dict[str, Any]) -> None:
    await db.patch(
        "check_results", {"run_id": f"eq.{run_id}", "check_name": f"eq.{name}"}, body
    )


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)
