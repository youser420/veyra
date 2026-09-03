# Framework adapters

Each adapter implements `invoke(prompt) -> AgentResponse` for verification checks.

## Selection

`get_adapter(framework, endpoint_url, config_file_path)` in `registry.py`.

## Contracts

| Framework | Expected endpoint | Request shape |
|-----------|-------------------|---------------|
| generic_http | Any POST URL | `{ "prompt": "..." }` |
| langchain | LangServe base or `/invoke` | `{ "input": { "question": "..." } }` |
| crewai | Crew HTTP API | `{ "inputs": { "query": "..." } }` |
| autogen | Proxy URL | `{ "message": "..." }` or chat format |
| flowise | Prediction API URL | `{ "question": "..." }` |
| dify | chat-messages URL | Dify blocking API + API key |
| make | Make webhook | Same as generic_http |

Extend adapters in Phase 1 when loading config files from Supabase Storage.
