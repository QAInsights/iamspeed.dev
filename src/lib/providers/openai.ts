import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const openaiAdapter = createOpenAICompatibleAdapter(
  "https://api.openai.com/v1",
  PROVIDERS.openai.name,
  PROVIDERS.openai.displayName
);
