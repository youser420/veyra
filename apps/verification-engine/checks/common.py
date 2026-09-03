from dataclasses import dataclass, field
from typing import Any

from adapters.base import AgentAdapter


@dataclass
class CheckContext:
    adapter: AgentAdapter | None = None
    agent_config: dict[str, Any] | None = field(default=None)
