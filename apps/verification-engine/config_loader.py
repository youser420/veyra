"""Load agent config files from Supabase Storage."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = "agent-configs"


async def load_agent_config(path: str | None) -> dict[str, Any] | None:
    if not path or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(url, headers=headers)
        if res.status_code >= 400:
            print(f"[engine] config load failed ({path}): {res.status_code}")
            return None

        raw = res.text
        if path.endswith(".json"):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return {"raw": raw}
        return {"raw": raw}
