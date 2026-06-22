import { normalizeBaseURL } from "./providers";
import { PROVIDERS } from "./config";

export interface ModelEntry {
  id: string;
  label: string;
  contextWindow: number;
}

const CACHE_KEY = "iamspeed_models_cache_v2"; // bumped for api.json + groq support
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MODELS_URL = "https://models.dev/api.json";

// Hardcoded fallback models — ONLY used when models.dev fetch fails or returns nothing usable.
const FALLBACK_MODELS: Record<string, ModelEntry[]> = {
  openai: [
    { id: "gpt-4o", label: "GPT-4o", contextWindow: 128000 },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", contextWindow: 128000 },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo", contextWindow: 128000 },
    { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", contextWindow: 16385 },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", contextWindow: 200000 },
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", contextWindow: 200000 },
    { id: "claude-3-opus-20240229", label: "Claude 3 Opus", contextWindow: 200000 },
    { id: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet", contextWindow: 200000 },
    { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", contextWindow: 200000 },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", contextWindow: 128000 },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", contextWindow: 128000 },
    { id: "gemma2-9b-it", label: "Gemma 2 9B", contextWindow: 8192 },
  ],
  openrouter: [
    { id: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)", contextWindow: 128000 },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (via OpenRouter)", contextWindow: 200000 },
    { id: "google/gemini-flash-1.5", label: "Gemini Flash 1.5 (via OpenRouter)", contextWindow: 1000000 },
    { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (via OpenRouter)", contextWindow: 128000 },
  ],
};

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface ModelsDevEntry {
  id: string;
  name: string;
  limit?: {
    context?: number;
    output?: number;
  };
}

async function fetchCatalog(): Promise<Record<string, ModelsDevEntry>> {
  const response = await fetch(MODELS_URL, {
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }
  const data = await response.json();

  // api.json (preferred for provider-specific): { "groq": { models: { "llama-...": {id, name, limit...} } } }
  if (data && typeof data === 'object' && !data.models) {
    // Flatten for getModelsForProvider compatibility.
    // Force keys under the provider so getModelsForProvider("groq") finds them.
    const flattened: Record<string, ModelsDevEntry> = {};
    for (const [prov, provData] of Object.entries(data)) {
      const modelsObj = (provData as { models?: Record<string, ModelsDevEntry> })?.models;
      if (modelsObj && typeof modelsObj === 'object') {
        for (const [mkey, ment] of Object.entries(modelsObj)) {
          const modelId = (ment as ModelsDevEntry).id || mkey;
          // Always create a filterable key under this prov
          const filterKey = `${prov}/${modelId.replace(/^\//, '')}`;
          flattened[filterKey] = ment as ModelsDevEntry;
        }
      }
    }
    if (Object.keys(flattened).length > 0) return flattened;
  }

  // catalog.json style: already flat under data.models
  if (data && data.models) {
    return data.models;
  }

  return data || {};
}

function getModelsForProvider(catalog: Record<string, ModelsDevEntry>, providerId: string): ModelEntry[] {
  const models: ModelEntry[] = [];
  
  for (const [key, entry] of Object.entries(catalog)) {
    if (key.startsWith(`${providerId}/`)) {
      models.push({
        id: entry.id || key.split('/').pop() || key,
        label: entry.name || key,
        contextWindow: entry.limit?.context || 0,
      });
    }
  }
  
  // Sort by context window descending, then by name
  return models.sort((a, b) => {
    if (b.contextWindow !== a.contextWindow) {
      return b.contextWindow - a.contextWindow;
    }
    return a.label.localeCompare(b.label);
  });
}

export async function loadModels(providerId: string, apiKey?: string): Promise<ModelEntry[]> {
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  let catalog: Record<string, ModelsDevEntry> | null = null;

  if (cached) {
    try {
      const entry: CacheEntry = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      if (age < CACHE_TTL_MS) {
        catalog = entry.data as Record<string, ModelsDevEntry>;
      }
    } catch {
      // Invalid cache, will refetch
    }
  }

  // Fetch if cache is stale or missing
  if (!catalog) {
    try {
      catalog = await fetchCatalog();

      // Update cache
      const cacheEntry: CacheEntry = {
        data: catalog,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn("Failed to fetch models from models.dev:", error);
      // catalog stays null — provider-endpoint fallback below may still work
    }
  }

  // 1. Try models.dev catalog first (primary source)
  let models: ModelEntry[] = catalog ? getModelsForProvider(catalog, providerId) : [];

  // 2. If models.dev has no models for this provider, try the provider's own
  //    /models endpoint (for providers not listed in models.dev, e.g. SambaNova)
  if (models.length === 0) {
    const endpoint = PROVIDERS[providerId]?.modelsEndpoint;
    if (endpoint) {
      models = await fetchModelsFromEndpoint(endpoint, apiKey);
    }
  }

  // 3. Legacy hardcoded fallback (only for providers with FALLBACK_MODELS entries)
  if (models.length === 0) {
    const fallback = FALLBACK_MODELS[providerId];
    if (fallback) {
      console.warn(`No models found for ${providerId}, using hardcoded fallback`);
      return fallback;
    }
    if (catalog) {
      console.warn(`No models found for ${providerId} in models.dev catalog`);
    }
  }

  return models;
}

export function clearModelCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Fetch models from any OpenAI-compatible /models endpoint.
 *
 * Shared by discoverLocalModels (for local servers like Ollama/LM Studio) and
 * by loadModels (as a fallback for providers not listed in models.dev, e.g.
 * SambaNova). Returns an empty array on any failure — callers handle the
 * empty case.
 *
 * For hosted providers that require auth (e.g. SambaNova), pass an apiKey
 * and it will be sent as a Bearer token. Local servers typically don't
 * need auth, so apiKey is optional.
 */
export async function fetchModelsFromEndpoint(baseURL: string, apiKey?: string): Promise<ModelEntry[]> {
  if (!baseURL) return [];
  try {
    const normalized = normalizeBaseURL(baseURL);
    const url = normalized + "/models";
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers,
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    const models: ModelEntry[] = list
      .map((m: { id?: unknown }) => ({
        id: String(m?.id || ""),
        label: String(m?.id || ""),
        contextWindow: 0,
      }))
      .filter((m: ModelEntry) => m.id);

    // Dedup + sort alphabetically (context unknown for endpoint discovery)
    const seen = new Set<string>();
    const unique = models.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    return unique.sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

export async function discoverLocalModels(baseURL: string): Promise<ModelEntry[]> {
  return fetchModelsFromEndpoint(baseURL);
}
