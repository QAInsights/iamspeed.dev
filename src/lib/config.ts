export const DEFAULT_PROMPT = "Say Hello World in five languages.";

export interface ProviderMetadata {
  name: string;
  displayName: string;
}

export const PROVIDERS: Record<string, ProviderMetadata> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
  },
};
