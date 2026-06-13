export interface StreamParams {
  apiKey: string;
  model: string;
  prompt: string;
  onChunk: (text: string) => void;
  onFirstToken: () => void;
  onDone: (rawResponse: object) => void;
  onError: (err: Error) => void;
  signal: AbortSignal;
}

export interface ProviderAdapter {
  id: string;
  name: string;
  stream(params: StreamParams): Promise<void>;
}
