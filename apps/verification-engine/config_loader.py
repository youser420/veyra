"""Load agent config files from Supabase Storage."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

import db

log = logging.getLogger("veyra.config")
BUCKET = "agent-configs"


async def load_agent_config(path: str | None) -> dict[str, Any] | None:
    if not path or not db.configured():
        return None

    url = f"{db.SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    headers = {
        "apikey": db.SUPABASE_SERVICE_KEY or "",
        "Authorization": f"Bearer {db.SUPABASE_SERVICE_KEY}",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(url, headers=headers)
        if res.status_code >= 400:
            log.warning("config load failed (%s): %s", path, res.status_code)
            return None

        raw = res.text
        if path.endswith(".json"):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return {"raw": raw}
        return {"raw": raw}
