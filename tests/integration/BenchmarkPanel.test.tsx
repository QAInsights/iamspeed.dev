/** @jsxImportSource preact */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import { BenchmarkPanel } from "../../src/components/BenchmarkPanel";
import { loadPrefs } from "../../src/lib/prefs";

// Mock dependencies
vi.mock("../../src/lib/modelRegistry", () => ({
  loadModels: vi.fn(),
  discoverLocalModels: vi.fn(),
}));
vi.mock("../../src/lib/providers", () => ({
  providers: {
    openai: {
      stream: vi.fn(),
    },
  },
  createOpenAICompatibleAdapter: vi.fn(),
  normalizeBaseURL: vi.fn(),
}));
vi.mock("../../src/lib/history", () => ({
  loadHistory: vi.fn().mockReturnValue([]),
  saveRun: vi.fn().mockReturnValue([]),
  clearHistory: vi.fn(),
}));
vi.mock("../../src/lib/prefs");

describe("BenchmarkPanel", () => {
  beforeEach(() => {
    vi.mocked(loadPrefs).mockReturnValue({
        providerId: "openai",
        modelId: "gpt-4o",
        apiKey: "test-key"
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders CurrentSelection with pricing", async () => {
    const { loadModels } = await import("../../src/lib/modelRegistry");
    vi.mocked(loadModels).mockResolvedValue([
      { id: "gpt-4o", label: "GPT-4o", contextWindow: 128000, pricing: { input: 5, output: 15 } },
    ]);

    const { container } = render(<BenchmarkPanel />);

    await waitFor(() => {
      const currentSelection = container.querySelector(".llm-current-selection");
      expect(currentSelection).not.toBeNull();
      expect(currentSelection?.textContent).toContain("$5.00 / $15.00");
    });
  });

  it("renders SecondaryMetrics with value score after run", async () => {
    const { loadModels } = await import("../../src/lib/modelRegistry");
    vi.mocked(loadModels).mockResolvedValue([
      { id: "gpt-4o", label: "GPT-4o", contextWindow: 128000, pricing: { input: 5, output: 15 } },
    ]);

    const { providers } = await import("../../src/lib/providers");
    vi.mocked(providers.openai.stream).mockImplementation(async ({ onFirstToken, onChunk, onDone, onUsage }) => {
      onFirstToken?.();
      onChunk?.(" a");
      onUsage?.({ inputTokens: 10, outputTokens: 20 });
      onDone?.({});
    });

    const { container } = render(<BenchmarkPanel />);
    
    await waitFor(() => {
        const startBtn = container.querySelector(".llm-btn-run") as HTMLButtonElement;
        expect(startBtn).not.toBeNull();
        fireEvent.click(startBtn);
    });

    await waitFor(() => {
        const showMoreToggle = container.querySelector(".llm-show-more") as HTMLButtonElement;
        expect(showMoreToggle).not.toBeNull();
        fireEvent.click(showMoreToggle);
    });

    await waitFor(() => {
      const secondaryMetrics = container.querySelector(".llm-secondary");
      expect(secondaryMetrics).not.toBeNull();
      const valueScoreEl = Array.from(secondaryMetrics!.querySelectorAll(".llm-sec-item")).find(el => el.textContent?.includes("TPS/$"));
      expect(valueScoreEl).not.toBeNull();
    });
  });
});
