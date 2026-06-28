import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const xaiAdapter = createOpenAICompatibleAdapter(
  "https://api.x.ai/v1",
  PROVIDERS.xai.name,
  PROVIDERS.xai.displayName
);
