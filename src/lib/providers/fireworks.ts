import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const fireworksAdapter = createOpenAICompatibleAdapter(
  "https://api.fireworks.ai/inference/v1",
  PROVIDERS.fireworks.name,
  PROVIDERS.fireworks.displayName
);
