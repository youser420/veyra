"""Outbound request safety: the engine must only call agents on the public internet.

Seller-supplied endpoint URLs are untrusted. Without this guard a seller could point
the engine at cloud metadata (169.254.169.254), localhost, or private network services.

Known limit: validation happens before each request, so a DNS-rebinding attacker with a
zero-TTL record could still race it. Production deployments should also run the engine
behind an egress proxy / network policy that blocks private ranges.
"""

from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
from urllib.parse import urlsplit


class UnsafeEndpointError(ValueError):
    """Raised when an endpoint URL is not allowed to be called."""


def allow_private_endpoints() -> bool:
    """Local development escape hatch (e.g. scripts/mock_agent.py on localhost)."""
    return os.getenv("ALLOW_PRIVATE_ENDPOINTS", "").strip().lower() in ("1", "true", "yes")


def _is_public(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


async def validate_endpoint(url: str) -> None:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise UnsafeEndpointError(f"Unsupported URL scheme: {parts.scheme or 'none'}")
    host = parts.hostname
    if not host:
        raise UnsafeEndpointError("Endpoint URL has no host")

    if allow_private_endpoints():
        return

    try:
        port = parts.port or (443 if parts.scheme == "https" else 80)
    except ValueError as e:
        raise UnsafeEndpointError(f"Invalid port: {e}") from e

    try:
        addresses = [ipaddress.ip_address(host)]
    except ValueError:
        try:
            infos = await asyncio.get_running_loop().getaddrinfo(
                host, port, type=socket.SOCK_STREAM
            )
        except socket.gaierror as e:
            raise UnsafeEndpointError(f"Could not resolve host {host}") from e
        addresses = [ipaddress.ip_address(info[4][0].split("%")[0]) for info in infos]

    if not addresses:
        raise UnsafeEndpointError(f"Could not resolve host {host}")
    for ip in addresses:
        if not _is_public(ip):
            raise UnsafeEndpointError(f"Endpoint resolves to non-public address {ip}")
