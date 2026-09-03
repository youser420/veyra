"""
Trigger scheduled monitor via web cron API.

Usage:
  set CRON_SECRET=your_secret   # same as apps/web/.env.local
  py -3.12 scripts/trigger_monitor.py

Requires web on :3000 and engine on :8000.
"""

import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv("../.env")
load_dotenv("../../apps/web/.env.local")

SECRET = os.getenv("CRON_SECRET")
APP_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

if not SECRET:
    print("Set CRON_SECRET (add to apps/web/.env.local)")
    sys.exit(1)

r = httpx.post(f"{APP_URL}/api/cron/monitor", headers={"x-cron-secret": SECRET}, timeout=60.0)
print(r.status_code, r.text)
