from adapters.autogen import AutoGenAdapter
from adapters.base import AdapterConfig, AgentAdapter
from adapters.crewai import CrewAIAdapter
from adapters.dify import DifyAdapter
from adapters.flowise import FlowiseAdapter
from adapters.generic_http import GenericHttpAdapter
from adapters.langchain import LangChainAdapter
from adapters.make import MakeAdapter

_REGISTRY: dict[str, type[AgentAdapter]] = {
    "generic_http": GenericHttpAdapter,
    "langchain": LangChainAdapter,
    "crewai": CrewAIAdapter,
    "autogen": AutoGenAdapter,
    "flowise": FlowiseAdapter,
    "dify": DifyAdapter,
    "make": MakeAdapter,
}

# UI labels from web app map to registry keys
_ALIASES = {
    "langchain": "langchain",
    "crewai": "crewai",
    "autogen": "autogen",
    "flowise": "flowise",
    "dify": "dify",
    "make.com": "make",
    "make": "make",
    "generic": "generic_http",
    "generic_http": "generic_http",
}


def get_adapter(
    framework: str | None,
    endpoint_url: str | None = None,
    config_file_path: str | None = None,
    submission_method: str | None = None,
    extra: dict | None = None,
) -> AgentAdapter:
    key = _ALIASES.get((framework or "generic_http").lower(), "generic_http")
    cls = _REGISTRY.get(key, GenericHttpAdapter)
    config = AdapterConfig(
        framework=key,
        endpoint_url=endpoint_url,
        config_file_path=config_file_path,
        submission_method=submission_method,
        extra=extra or {},
    )
    return cls(config)


def list_frameworks() -> list[str]:
    return list(_REGISTRY.keys())
