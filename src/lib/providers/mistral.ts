import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const mistralAdapter = createOpenAICompatibleAdapter(
  "https://api.mistral.ai/v1",
  PROVIDERS.mistral.name,
  PROVIDERS.mistral.displayName
);
