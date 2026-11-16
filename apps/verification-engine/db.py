"""Minimal Supabase REST client used by the engine (service role)."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

log = logging.getLogger("veyra.db")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def _headers(representation: bool = False) -> dict[str, str]:
    headers = {
        "apikey": SUPABASE_SERVICE_KEY or "",
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if representation:
        headers["Prefer"] = "return=representation"
    return headers


async def patch(table: str, filters: dict[str, str], body: dict[str, Any]) -> bool:
    """PATCH rows matching PostgREST filters, e.g. {"id": "eq.<uuid>"}. Returns success."""
    if not configured():
        log.warning("Supabase not configured — skipping %s update", table)
        return False
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.patch(
            f"{SUPABASE_URL}/rest/v1/{table}", params=filters, headers=_headers(), json=body
        )
    if r.status_code >= 400:
        log.error("%s patch failed: %s %s", table, r.status_code, r.text[:300])
        return False
    return True


async def select_one(table: str, filters: dict[str, str]) -> dict[str, Any] | None:
    if not configured():
        return None
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={**filters, "select": "*"},
            headers=_headers(),
        )
    if r.status_code >= 400:
        log.error("%s select failed: %s %s", table, r.status_code, r.text[:300])
        return None
    rows = r.json()
    return rows[0] if rows else None


async def insert(table: str, body: dict[str, Any]) -> dict[str, Any] | None:
    if not configured():
        log.warning("Supabase not configured — skipping %s insert", table)
        return None
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/{table}", headers=_headers(representation=True), json=body
        )
    if r.status_code >= 400:
        log.error("%s insert failed: %s %s", table, r.status_code, r.text[:300])
        return None
    data = r.json()
    return data[0] if isinstance(data, list) and data else data
