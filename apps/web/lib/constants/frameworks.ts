export const AGENT_FRAMEWORKS = [
  { id: "generic_http", label: "Generic HTTP", hint: "POST { prompt } → { response }" },
  { id: "langchain", label: "LangChain / LangServe", hint: "POST /invoke with input.question" },
  { id: "crewai", label: "CrewAI", hint: "POST with inputs.query" },
  { id: "autogen", label: "AutoGen", hint: "POST message or chat format" },
  { id: "flowise", label: "Flowise", hint: "POST prediction API" },
  { id: "dify", label: "Dify", hint: "chat-messages blocking API" },
  { id: "make", label: "Make.com", hint: "Webhook URL (generic POST)" },
] as const;

export type AgentFrameworkId = (typeof AGENT_FRAMEWORKS)[number]["id"];
