"""Create trust incidents via Supabase REST."""

from __future__ import annotations

from typing import Any

import db


async def create_incident(payload: dict[str, Any]) -> dict | None:
    return await db.insert("trust_incidents", payload)
