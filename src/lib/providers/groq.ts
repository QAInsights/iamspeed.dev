import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const groqAdapter = createOpenAICompatibleAdapter(
  "https://api.groq.com/openai/v1",
  PROVIDERS.groq.name,
  PROVIDERS.groq.displayName
);
