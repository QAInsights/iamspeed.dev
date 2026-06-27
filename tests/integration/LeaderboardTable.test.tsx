/** @jsxImportSource preact */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import { LeaderboardTable } from "../../src/components/LeaderboardTable";

const makeEntry = (overrides: Partial<{
  id: string;
  rank: number;
  handle: string;
  region: string;
  provider: string;
  model: string;
  tps: number;
  ttft: number;
  ttlt: number;
  createdAt: string;
}> = {}) => ({
  id: "entry-1",
  rank: 1,
  handle: "crimson_falcon_0001",
  region: "Americas-E",
  provider: "openai",
  model: "openai/gpt-4o",
  tps: 120.5,
  ttft: 250,
  ttlt: 3000,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("LeaderboardTable", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockFetch = (entries: ReturnType<typeof makeEntry>[]) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => entries,
    } as Response);
  };

  it("renders title and subtitle", async () => {
    mockFetch([makeEntry()]);
    const { container, getByText } = render(<LeaderboardTable />);
    await waitFor(() => expect(getByText("Leaderboard")).toBeTruthy());
    expect(container.querySelector(".llm-lb-title")).toBeTruthy();
    expect(container.querySelector(".llm-lb-subtitle")).toBeTruthy();
  });

  it("renders sort toggle with TPS and TTFT buttons", async () => {
    mockFetch([makeEntry()]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const toggle = container.querySelector(".llm-lb-sort-toggle");
    expect(toggle).toBeTruthy();

    const buttons = toggle!.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]!.textContent).toBe("TPS");
    expect(buttons[1]!.textContent).toBe("TTFT");
  });

  it("defaults to TPS sort with TPS button active", async () => {
    mockFetch([makeEntry()]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const buttons = container.querySelectorAll(".llm-lb-sort-btn");
    expect(buttons[0]!.classList.contains("llm-lb-sort-active")).toBe(true);
    expect(buttons[1]!.classList.contains("llm-lb-sort-active")).toBe(false);
  });

  it("shows TPS subtitle when sorted by TPS", async () => {
    mockFetch([makeEntry()]);
    const { getByText } = render(<LeaderboardTable />);
    await waitFor(() => expect(getByText("Leaderboard")).toBeTruthy());
    expect(getByText("Top speeds — ranked by tokens per second.")).toBeTruthy();
  });

  it("shows TTFT subtitle when sorted by TTFT", async () => {
    mockFetch([makeEntry()]);
    const { container, getByText } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    fireEvent.click(container.querySelectorAll(".llm-lb-sort-btn")[1]!);
    expect(getByText("Fastest starts — ranked by time to first token.")).toBeTruthy();
  });

  it("renders table rows from fetched entries", async () => {
    mockFetch([
      makeEntry({ id: "1", handle: "alpha", tps: 100, ttft: 200 }),
      makeEntry({ id: "2", handle: "beta", tps: 80, ttft: 150 }),
      makeEntry({ id: "3", handle: "gamma", tps: 60, ttft: 100 }),
    ]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
  });

  it("sorts by TPS descending by default", async () => {
    mockFetch([
      makeEntry({ id: "1", handle: "slow", tps: 50, ttft: 100 }),
      makeEntry({ id: "2", handle: "fast", tps: 200, ttft: 300 }),
      makeEntry({ id: "3", handle: "mid", tps: 100, ttft: 200 }),
    ]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const handleCells = container.querySelectorAll(".llm-lb-handle-cell");
    expect(handleCells[0]!.textContent).toBe("fast");
    expect(handleCells[1]!.textContent).toBe("mid");
    expect(handleCells[2]!.textContent).toBe("slow");
  });

  it("sorts by TTFT ascending when TTFT is selected", async () => {
    mockFetch([
      makeEntry({ id: "1", handle: "slow", tps: 200, ttft: 300 }),
      makeEntry({ id: "2", handle: "fast", tps: 50, ttft: 100 }),
      makeEntry({ id: "3", handle: "mid", tps: 100, ttft: 200 }),
    ]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    fireEvent.click(container.querySelectorAll(".llm-lb-sort-btn")[1]!);

    const handleCells = container.querySelectorAll(".llm-lb-handle-cell");
    expect(handleCells[0]!.textContent).toBe("fast");
    expect(handleCells[1]!.textContent).toBe("mid");
    expect(handleCells[2]!.textContent).toBe("slow");
  });

  it("assigns rank 1 to the top entry", async () => {
    mockFetch([
      makeEntry({ id: "1", handle: "slow", tps: 50 }),
      makeEntry({ id: "2", handle: "fast", tps: 200 }),
    ]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const rankCells = container.querySelectorAll(".llm-lb-rank-cell");
    expect(rankCells[0]!.textContent).toBe("1");
    expect(rankCells[1]!.textContent).toBe("2");
  });

  it("re-ranks entries when switching sort metric", async () => {
    mockFetch([
      makeEntry({ id: "1", handle: "a", tps: 200, ttft: 300 }),
      makeEntry({ id: "2", handle: "b", tps: 100, ttft: 100 }),
    ]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    // TPS sort: a is rank 1
    expect(container.querySelectorAll(".llm-lb-rank-cell")[0]!.textContent).toBe("1");
    expect(container.querySelectorAll(".llm-lb-handle-cell")[0]!.textContent).toBe("a");

    // Switch to TTFT: b is rank 1 (lower TTFT)
    fireEvent.click(container.querySelectorAll(".llm-lb-sort-btn")[1]!);
    expect(container.querySelectorAll(".llm-lb-rank-cell")[0]!.textContent).toBe("1");
    expect(container.querySelectorAll(".llm-lb-handle-cell")[0]!.textContent).toBe("b");
  });

  it("highlights active sort column with llm-lb-sort-col class", async () => {
    mockFetch([makeEntry()]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    // TPS column should be highlighted
    const tpsHeader = container.querySelector("th.llm-lb-tps");
    expect(tpsHeader!.classList.contains("llm-lb-sort-col")).toBe(true);

    // TTFT column should not
    const ttftHeader = container.querySelector("th.llm-lb-ttft");
    expect(ttftHeader!.classList.contains("llm-lb-sort-col")).toBe(false);
  });

  it("shows skeleton loading state before data arrives", () => {
    mockFetch([makeEntry()]);
    const { container } = render(<LeaderboardTable />);
    expect(container.querySelector(".llm-lb-skeleton")).toBeTruthy();
    expect(container.querySelector("table")).toBeNull();
  });

  it("shows empty state when no entries returned", async () => {
    mockFetch([]);
    const { container, getByText } = render(<LeaderboardTable />);
    await waitFor(() => expect(getByText("No submissions yet. Be the first!")).toBeTruthy());
    expect(container.querySelector("table")).toBeNull();
  });

  it("shows error state with retry button when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const { container, getByText } = render(<LeaderboardTable />);
    await waitFor(() => expect(getByText("Couldn't load leaderboard.")).toBeTruthy());
    expect(container.querySelector("table")).toBeNull();
    expect(getByText("Retry")).toBeTruthy();
  });

  it("strips provider prefix from model names", async () => {
    mockFetch([makeEntry({ model: "openai/gpt-4o" })]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const modelCell = container.querySelector(".llm-lb-model-cell");
    expect(modelCell!.textContent).toBe("gpt-4o");
  });

  it("keeps model name without prefix as-is", async () => {
    mockFetch([makeEntry({ model: "llama3" })]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const modelCell = container.querySelector(".llm-lb-model-cell");
    expect(modelCell!.textContent).toBe("llama3");
  });

  it("does not render When column in table header", async () => {
    mockFetch([makeEntry()]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const headers = Array.from(container.querySelectorAll("th")).map((th) => th.textContent);
    expect(headers).not.toContain("When");
  });

  it("renders region column with region value", async () => {
    mockFetch([makeEntry({ region: "EU-West" })]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const regionCell = container.querySelector(".llm-lb-region-cell");
    expect(regionCell!.textContent).toBe("EU-West");
  });

  it("fetches with limit=15", async () => {
    mockFetch([makeEntry()]);
    render(<LeaderboardTable />);
    await waitFor(() => expect(vi.mocked(globalThis.fetch)).toHaveBeenCalled());
    const url = vi.mocked(globalThis.fetch).mock.calls[0]![0] as string;
    expect(url).toContain("limit=15");
  });

  it("applies podium flash class to top 3 rows after toggle", async () => {
    mockFetch([
      makeEntry({ id: "1", handle: "a", tps: 300, ttft: 300 }),
      makeEntry({ id: "2", handle: "b", tps: 200, ttft: 200 }),
      makeEntry({ id: "3", handle: "c", tps: 100, ttft: 100 }),
    ]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    // Before toggle, no flash classes
    expect(container.querySelector(".llm-lb-podium-flash")).toBeNull();

    // Toggle to TTFT
    fireEvent.click(container.querySelectorAll(".llm-lb-sort-btn")[1]!);

    // Top 3 rows should have podium flash class
    const flashRows = container.querySelectorAll(".llm-lb-podium-flash");
    expect(flashRows.length).toBe(3);
  });

  it("applies rank color classes to top 3", async () => {
    mockFetch([
      makeEntry({ id: "1", handle: "a", tps: 300 }),
      makeEntry({ id: "2", handle: "b", tps: 200 }),
      makeEntry({ id: "3", handle: "c", tps: 100 }),
    ]);
    const { container } = render(<LeaderboardTable />);
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());

    const rankCells = container.querySelectorAll(".llm-lb-rank-cell");
    expect(rankCells[0]!.classList.contains("llm-lb-rank-1")).toBe(true);
    expect(rankCells[1]!.classList.contains("llm-lb-rank-2")).toBe(true);
    expect(rankCells[2]!.classList.contains("llm-lb-rank-3")).toBe(true);
  });
});
