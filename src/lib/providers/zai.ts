import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const zaiAdapter = createOpenAICompatibleAdapter(
  "https://api.z.ai/api/paas/v4",
  PROVIDERS.zai.name,
  PROVIDERS.zai.displayName
);
