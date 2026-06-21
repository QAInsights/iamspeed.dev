import { PROVIDERS } from "../config";
import { createOpenAICompatibleAdapter } from "./openaiCompatible";

// Google exposes an OpenAI-compatible endpoint for Gemini models.
// See: https://ai.google.dev/gemini-api/docs/openai
export const googleAdapter = createOpenAICompatibleAdapter(
  "https://generativelanguage.googleapis.com/v1beta/openai",
  PROVIDERS.google.name,
  PROVIDERS.google.displayName
);
