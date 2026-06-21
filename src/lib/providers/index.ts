import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { groqAdapter } from "./groq";
import { openrouterAdapter } from "./openrouter";
import { googleAdapter } from "./google";
import type { ProviderAdapter } from "./types";

export const providers: Record<string, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
  openrouter: openrouterAdapter,
  google: googleAdapter,
};

export type { ProviderAdapter, StreamParams } from "./types";
export { createOpenAICompatibleAdapter, normalizeBaseURL } from "./openaiCompatible";
