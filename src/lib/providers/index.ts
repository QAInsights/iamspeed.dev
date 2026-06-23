import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { groqAdapter } from "./groq";
import { cerebrasAdapter } from "./cerebras";
import { fireworksAdapter } from "./fireworks";
import { mistralAdapter } from "./mistral";
import { openrouterAdapter } from "./openrouter";
import { googleAdapter } from "./google";
import type { ProviderAdapter } from "./types";

export const providers: Record<string, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
  cerebras: cerebrasAdapter,
  fireworks: fireworksAdapter,
  mistral: mistralAdapter,
  openrouter: openrouterAdapter,
  google: googleAdapter,
};

export type { ProviderAdapter, StreamParams } from "./types";
export { createOpenAICompatibleAdapter, normalizeBaseURL } from "./openaiCompatible";
