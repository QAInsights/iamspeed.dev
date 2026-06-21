import type { ProviderAdapter, StreamParams } from "./types";

export function normalizeBaseURL(input: string): string {
  if (!input) return "";
  let url = input.trim().replace(/\/+$/, "");
  if (!/\/v1$|\/openai\/v1$/.test(url)) {
    url = url + "/v1";
  }
  return url;
}

export function createOpenAICompatibleAdapter(
  baseURL: string,
  providerName: string,
  displayName: string,
  extraHeaders?: Record<string, string>
): ProviderAdapter {
  return {
    id: providerName,
    name: displayName,

    async stream({
      apiKey,
      model,
      prompt,
      onChunk,
      onFirstToken,
      onUsage,
      onProcessing,
      onDone,
      onError,
      signal,
    }: StreamParams) {
      // Strip leading provider prefix only when appropriate.
      // For Groq, some systems intentionally use "groq/xxx" as the model id.
      let modelId = model;
      if (model.startsWith(`${providerName}/`)) {
        const candidate = model.slice(providerName.length + 1);
        if (providerName === 'groq' && model.startsWith('groq/')) {
          modelId = model; // keep full for groq/compound etc.
        } else {
          modelId = candidate;
        }
      }

      let response: Response;
      try {
        response = await fetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...(extraHeaders || {}),
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: prompt }],
            stream: true,
            stream_options: { include_usage: true },
          }),
          signal,
        });
      } catch (err) {
        if (signal.aborted) return;
        onError(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          errMsg = body?.error?.message || errMsg;
        } catch {
          // ignore parse failure
        }
        onError(new Error(errMsg));
        return;
      }

      if (!response.body) {
        onError(new Error("Response body is null"));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstTokenFired = false;
      const rawChunks: object[] = [];
      let usageData: { prompt_tokens: number; completion_tokens: number } | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            // SSE comment lines start with ":" and must be ignored per spec.
            // OpenRouter sends ": OPENROUTER PROCESSING" as a heartbeat while
            // a request is queued or being processed — surface it via onProcessing.
            if (trimmed.startsWith(":")) {
              if (onProcessing) onProcessing();
              continue;
            }
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              rawChunks.push(parsed);
              if (parsed.usage) {
                usageData = {
                  prompt_tokens: parsed.usage.prompt_tokens,
                  completion_tokens: parsed.usage.completion_tokens,
                };
              }
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                if (!firstTokenFired) {
                  firstTokenFired = true;
                  onFirstToken();
                }
                onChunk(content);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }

        if (usageData && onUsage) {
          onUsage({ inputTokens: usageData.prompt_tokens, outputTokens: usageData.completion_tokens });
        }
        onDone({ chunks: rawChunks });
      } catch (err) {
        if (signal.aborted) return;
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
  };
}
