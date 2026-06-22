import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const sambanovaAdapter = createOpenAICompatibleAdapter(
  "https://api.sambanova.ai/v1",
  PROVIDERS.sambanova.name,
  PROVIDERS.sambanova.displayName
);
