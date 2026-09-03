from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AdapterConfig:
    framework: str
    endpoint_url: str | None = None
    config_file_path: str | None = None
    submission_method: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResponse:
    text: str
    latency_ms: float
    status_code: int
    raw: dict[str, Any] = field(default_factory=dict)


class AgentAdapter(ABC):
    """Normalizes how verification checks invoke an agent."""

    framework: str = "generic"

    def __init__(self, config: AdapterConfig):
        self.config = config

    @abstractmethod
    async def invoke(self, prompt: str, **kwargs: Any) -> AgentResponse:
        ...

    def can_invoke(self) -> bool:
        return bool(self.config.endpoint_url)

    def describe(self) -> dict[str, Any]:
        return {
            "framework": self.framework,
            "endpoint_url": self.config.endpoint_url,
            "submission_method": self.config.submission_method,
            "can_invoke": self.can_invoke(),
        }
