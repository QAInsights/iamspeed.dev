# ⚡ I am speed.

Fast.com but for LLMs.

## Features

- Live streaming output with real-time metrics
- Time-to-first-token (TTFT) measurement
- Throughput tracking in tokens/sec
- AES-GCM encrypted API key storage (local only)
- OpenAI and Anthropic provider support
- Responsive, minimal UI inspired by [fast.com](https://fast.com)

## Quick Start

```bash
cd llmmark
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

1. Create a new adapter in `src/lib/providers/` that implements the `ProviderAdapter` interface
2. Register it in `src/lib/providers/index.ts`
3. Add provider metadata to `src/lib/config.ts`

## Tech Stack

- **Astro** (static site generation)
- **Preact** (interactive islands)
- **TypeScript** (strict mode)
- **Vitest** (unit tests)
- **Playwright** (E2E tests)

## License

MIT
