"""Create trust incidents via Supabase REST."""

from __future__ import annotations

import os
from typing import Any

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_KEY or "",
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def create_incident(payload: dict[str, Any]) -> dict | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("[engine] Supabase not configured — skipping incident")
        return None
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/trust_incidents",
            headers=_headers(),
            json=payload,
        )
        if r.status_code >= 400:
            print(f"[engine] trust_incidents insert failed: {r.status_code} {r.text}")
            return None
        data = r.json()
        return data[0] if isinstance(data, list) and data else data
