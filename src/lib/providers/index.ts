import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import type { ProviderAdapter } from "./types";

export const providers: Record<string, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
};

export type { ProviderAdapter, StreamParams } from "./types";
