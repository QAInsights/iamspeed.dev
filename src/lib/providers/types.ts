export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
}

export interface StreamParams {
  apiKey: string;
  model: string;
  prompt: string;
  onChunk: (text: string) => void;
  onFirstToken: () => void;
  onUsage?: (usage: UsageInfo) => void;
  onDone: (rawResponse: object) => void;
  onError: (err: Error) => void;
  signal: AbortSignal;
}

export interface ProviderAdapter {
  id: string;
  name: string;
  stream(params: StreamParams): Promise<void>;
}
