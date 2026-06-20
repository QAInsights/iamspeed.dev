export const DEFAULT_PROMPT = "Say Hello World in five languages.";

export const LOCAL_PROVIDER_ID = "local";
export const DEFAULT_LOCAL_BASE_URL = "http://localhost:11434/v1";

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
  local: {
    name: LOCAL_PROVIDER_ID,
    displayName: "Local",
    category: "open",
    description: "Ollama, LM Studio, llama.cpp and other OpenAI-compatible local servers",
  },
};
