# ⚡ I am speed.

Fast.com but for LLMs.

## Features

- Live streaming output with real-time metrics
- Time-to-first-token (TTFT) measurement
- Throughput tracking in tokens/sec
- AES-GCM encrypted API key storage (local only)
- OpenAI, Anthropic, Groq, and Local (Ollama, LM Studio, etc.) provider support
- Responsive, minimal UI inspired by [fast.com](https://fast.com)

## Quick Start

```bash
cd iamspeed.dev
npm install
npm run dev
```

Open `http://localhost:4321`, click the gear icon to configure your API key, then hit Run.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Adding a Provider

1. Create a new adapter in `src/lib/providers/` (many providers can reuse the OpenAI-compatible adapter)
2. Register it in `src/lib/providers/index.ts`
3. Add provider metadata to `src/lib/config.ts`

## Local Models

Select **Local** in settings.

- Base URL defaults to Ollama's standard: `http://localhost:11434/v1`
- Common alternatives:
  - LM Studio: `http://localhost:1234/v1`
  - llama.cpp server: `http://localhost:8080/v1`
- Click **Discover models from endpoint** to fetch and auto-populate available models into a select dropdown (API key is optional).
- Click **Enter model manually** if you need to override the dropdown and type a custom model ID directly.
- Your local server **must allow browser CORS**:
  - Ollama: `OLLAMA_ORIGINS="*" ollama serve` (or export the variable)
- **HTTPS/Mixed Content Note**: If you access this app via HTTPS (e.g., `https://iamspeed.dev`), modern browsers block insecure HTTP requests to local endpoints (Mixed Content). To work around this, either run the app locally on `http://localhost:4321` (recommended), or configure a secure tunnel like **Cloudflare Tunnels**: `npx cloudflared tunnel --url http://localhost:11434 --http-host-header localhost`. *Note: Free ngrok tunnels are blocked because their browser warning interstitial violates browser CORS policies.*
- The app runs entirely in the browser — no proxy.

## License

MIT
