import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const cerebrasAdapter = createOpenAICompatibleAdapter(
  "https://api.cerebras.ai/v1",
  PROVIDERS.cerebras.name,
  PROVIDERS.cerebras.displayName
);
