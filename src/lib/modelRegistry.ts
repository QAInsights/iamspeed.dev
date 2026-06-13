export interface ModelEntry {
  id: string;
  label: string;
  contextWindow: number;
}

const CACHE_KEY = "iamspeed_models_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MODELS_URL = "https://models.dev/catalog.json";

// Hardcoded fallback models in case models.dev is unavailable
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
  return data.models || {};
}

function getModelsForProvider(catalog: Record<string, ModelsDevEntry>, providerId: string): ModelEntry[] {
  const models: ModelEntry[] = [];
  
  for (const [key, entry] of Object.entries(catalog)) {
    if (key.startsWith(`${providerId}/`)) {
      models.push({
        id: entry.id,
        label: entry.name,
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

export async function loadModels(providerId: string): Promise<ModelEntry[]> {
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
      console.warn("Failed to fetch models from models.dev, using fallback:", error);
      // Return hardcoded fallback
      return FALLBACK_MODELS[providerId] || [];
    }
  }
  
  const models = getModelsForProvider(catalog, providerId);
  
  // If no models found from catalog, use fallback
  if (models.length === 0) {
    console.warn(`No models found for ${providerId} in catalog, using fallback`);
    return FALLBACK_MODELS[providerId] || [];
  }
  
  return models;
}

export function clearModelCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
