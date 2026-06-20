export const DEFAULT_PROMPT = "Say Hello World in five languages.";

export interface ProviderMetadata {
  name: string;
  displayName: string;
  // Future-proof fields for when we have many providers
  category?: 'frontier' | 'fast' | 'open' | 'other';
  description?: string;
}

export const PROVIDERS: Record<string, ProviderMetadata> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    category: "frontier",
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    category: "frontier",
  },
  groq: {
    name: "groq",
    displayName: "Groq",
    category: "fast",
    description: "Fast inference for open models",
  },
};
