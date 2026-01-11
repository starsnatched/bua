Browser/Computer Use Agent

```
docker compose up -d

export OPENAI_API_KEY=sk-...
bun dev # visit: http://localhost:3000
```

Supports OpenAI vision models (gpt-4o, gpt-4o-mini, gpt-4-turbo) or any OpenAI-compatible API.

Configure `config.json`:

```json
{
  "llm": {
    "model": "gpt-4o",
    "temperature": 0.1,
    "maxTokens": 4096,
    "baseUrl": "https://api.openai.com/v1"
  }
}
```

Set `baseUrl` to use alternative OpenAI-compatible endpoints (Azure OpenAI, local servers, etc.).
