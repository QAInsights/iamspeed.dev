export const DEFAULT_PROMPT = "Say Hello World in five languages.";

export const LOCAL_PROVIDER_ID = "local";
export const DEFAULT_LOCAL_BASE_URL = "http://localhost:11434/v1";

export interface ProviderMetadata {
  name: string;
  displayName: string;
  // Future-proof fields for when we have many providers
  category?: 'frontier' | 'fast' | 'open' | 'other';
  description?: string;
  /**
   * OpenAI-compatible /models endpoint used as a fallback when the provider
   * is not listed in models.dev. If omitted, loadModels returns [] when
   * models.dev has no models for this provider.
   */
  modelsEndpoint?: string;
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
  cerebras: {
    name: "cerebras",
    displayName: "Cerebras",
    category: "fast",
    description: "Fastest inference for open models on Cerebras wafer-scale engines",
  },
  fireworks: {
    name: "fireworks",
    displayName: "Fireworks AI",
    category: "fast",
    description: "Fast inference for open and fine-tuned models on Fireworks AI",
    modelsEndpoint: "https://api.fireworks.ai/v1/accounts/fireworks/models?filter=supports_serverless=true&pageSize=200",
  },
  mistral: {
    name: "mistral",
    displayName: "Mistral",
    category: "frontier",
    description: "Mistral AI frontier and open models via the OpenAI-compatible La Plateforme API",
  },
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    category: "frontier",
    description: "Unified access to many providers and open models",
  },
  google: {
    name: "google",
    displayName: "Google",
    category: "frontier",
    description: "Gemini models via Google's OpenAI-compatible endpoint",
  },
  xai: {
    name: "xai",
    displayName: "x.ai",
    category: "frontier",
    description: "Grok models via x.ai's OpenAI-compatible API",
    modelsEndpoint: "https://api.x.ai/v1",
  },
  local: {
    name: LOCAL_PROVIDER_ID,
    displayName: "Local",
    category: "open",
    description: "Ollama, LM Studio, llama.cpp and other OpenAI-compatible local servers",
  },
};
