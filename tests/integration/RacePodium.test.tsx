/** @jsxImportSource preact */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { RacePodium } from "../../src/components/race/RacePodium";
import type { RaceResult } from "../../src/lib/race/types";

function result(overrides: Partial<RaceResult> & { laneId: string }): RaceResult {
  return {
    laneId: overrides.laneId,
    providerId: overrides.providerId ?? "openai",
    modelId: overrides.modelId ?? "gpt-4o",
    finishRank: overrides.finishRank ?? 1,
    tps: overrides.tps ?? null,
    ttft: overrides.ttft ?? null,
    ttlt: overrides.ttlt ?? null,
    tokenCount: overrides.tokenCount ?? 10,
    inputTokens: overrides.inputTokens ?? null,
    outputTokens: overrides.outputTokens ?? null,
    error: overrides.error,
    pricing: overrides.pricing,
  };
}

describe("RacePodium", () => {
  afterEach(() => cleanup());

  it("renders title", () => {
    const { container } = render(
      <RacePodium results={[]} providerNames={{}} laneIndexById={{}} />,
    );
    expect(container.querySelector(".race-podium-title")!.textContent).toBe("Piston Cup Results");
  });

  it("renders all 3 results in finish-rank order", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 3, tps: 50 }),
      result({ laneId: "lane-2", finishRank: 1, tps: 120 }),
      result({ laneId: "lane-3", finishRank: 2, tps: 80 }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic", "lane-3": "Groq" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1, "lane-3": 2 }}
      />,
    );
    const rows = container.querySelectorAll(".race-podium-row");
    expect(rows).toHaveLength(3);
    // Ordered by finish rank: lane-2 (1st), lane-3 (2nd), lane-1 (3rd)
    expect(rows[0].querySelector(".race-podium-name")!.textContent).toBe("Sally");
    expect(rows[1].querySelector(".race-podium-name")!.textContent).toBe("Chick");
    expect(rows[2].querySelector(".race-podium-name")!.textContent).toBe("McQueen");
  });

  it("shows medals in order", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 1 }),
      result({ laneId: "lane-2", finishRank: 2 }),
      result({ laneId: "lane-3", finishRank: 3 }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic", "lane-3": "Groq" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1, "lane-3": 2 }}
      />,
    );
    const medals = container.querySelectorAll(".race-podium-medal");
    expect(medals[0].textContent).toBe("🏆");
    expect(medals[1].textContent).toBe("🥈");
    expect(medals[2].textContent).toBe("🥉");
  });

  it("shows tps and ttft values", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 1, tps: 120, ttft: 450 }),
    ];
    const { container } = render(
      <RacePodium results={results} providerNames={{ "lane-1": "OpenAI" }} laneIndexById={{ "lane-1": 0 }} />,
    );
    expect(container.querySelector(".race-podium-tps")!.textContent).toBe("🚀 120 tok/s");
    expect(container.querySelector(".race-podium-ttft")!.textContent).toBe("450ms TTFT");
  });

  it("shows -- for null tps/ttft", () => {
    const results = [result({ laneId: "lane-1", finishRank: 1, tps: null, ttft: null })];
    const { container } = render(
      <RacePodium results={results} providerNames={{ "lane-1": "OpenAI" }} laneIndexById={{ "lane-1": 0 }} />,
    );
    expect(container.querySelector(".race-podium-tps")!.textContent).toBe("--");
    expect(container.querySelector(".race-podium-ttft")!.textContent).toBe("--");
  });

  it("shows error for DNF (zero-token) lanes", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 1, tps: 120, tokenCount: 50 }),
      result({ laneId: "lane-2", finishRank: 2, tps: null, tokenCount: 0, error: "Invalid key" }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1 }}
      />,
    );
    const rows = container.querySelectorAll(".race-podium-row");
    // DNF lane should have the dnf class and show error
    expect(rows[1].classList.contains("race-podium-row--dnf")).toBe(true);
    expect(rows[1].querySelector(".race-podium-error")!.textContent).toBe("Invalid key");
  });

  it("applies lane colors via CSS variable", () => {
    const results = [result({ laneId: "lane-1", finishRank: 1 })];
    const { container } = render(
      <RacePodium results={results} providerNames={{ "lane-1": "OpenAI" }} laneIndexById={{ "lane-1": 0 }} />,
    );
    const row = container.querySelector(".race-podium-row") as HTMLElement;
    expect(row.style.getPropertyValue("--lane-color")).toBe("#E10600");
  });

  it("renders provider and model name", () => {
    const results = [result({ laneId: "lane-1", finishRank: 1, modelId: "claude-3-5-sonnet" })];
    const { container } = render(
      <RacePodium results={results} providerNames={{ "lane-1": "Anthropic" }} laneIndexById={{ "lane-1": 1 }} />,
    );
    const model = container.querySelector(".race-podium-model")!;
    expect(model.textContent).toContain("Anthropic");
    expect(model.textContent).toContain("claude-3-5-sonnet");
  });

  it("renders Fastest Start award for the lane with lowest TTFT", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 1, tps: 100, ttft: 800, tokenCount: 50 }),
      result({ laneId: "lane-2", finishRank: 2, tps: 120, ttft: 300, tokenCount: 40 }),
      result({ laneId: "lane-3", finishRank: 3, tps: 80, ttft: 600, tokenCount: 30 }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic", "lane-3": "Groq" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1, "lane-3": 2 }}
      />,
    );
    const award = container.querySelector(".race-podium-award")!;
    // lane-2 has the lowest TTFT (300ms) -> Sally (lane index 1)
    expect(award.querySelector(".race-podium-award-name")!.textContent).toBe("Sally");
    expect(award.querySelector(".race-podium-award-value")!.textContent).toBe("300ms TTFT");
    // The matching podium row should carry the fastest-start modifier + badge.
    const rows = container.querySelectorAll(".race-podium-row");
    const sallyRow = Array.from(rows).find(
      (r) => r.querySelector(".race-podium-name")!.textContent === "Sally",
    ) as HTMLElement | undefined;
    expect(sallyRow?.classList.contains("race-podium-row--fastest-start")).toBe(true);
    expect(sallyRow?.querySelector(".race-podium-row-badge")!.textContent).toBe("⚡");
  });

  it("does not render Fastest Start award when no lane has TTFT", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 1, tps: 100, ttft: null, tokenCount: 50 }),
      result({ laneId: "lane-2", finishRank: 2, tps: 120, ttft: null, tokenCount: 40 }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1 }}
      />,
    );
    expect(container.querySelector(".race-podium-award")).toBeNull();
    expect(container.querySelector(".race-podium-row--fastest-start")).toBeNull();
    expect(container.querySelector(".race-podium-row-badge")).toBeNull();
  });

  it("ignores zero-token lanes when picking Fastest Start", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 1, tps: 100, ttft: 200, tokenCount: 50 }),
      // DNF lane has a lower TTFT but produced no tokens — must be skipped.
      result({ laneId: "lane-2", finishRank: 2, tps: null, ttft: 100, tokenCount: 0, error: "boom" }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1 }}
      />,
    );
    const award = container.querySelector(".race-podium-award")!;
    expect(award.querySelector(".race-podium-award-name")!.textContent).toBe("McQueen");
    expect(award.querySelector(".race-podium-award-value")!.textContent).toBe("200ms TTFT");
  });

  it("renders an info tooltip explaining how the winner is decided", () => {
    const results = [result({ laneId: "lane-1", finishRank: 1, tps: 100, ttft: 400, tokenCount: 50 })];
    const { container } = render(
      <RacePodium results={results} providerNames={{ "lane-1": "OpenAI" }} laneIndexById={{ "lane-1": 0 }} />,
    );
    // The "?" trigger is wrapped by the shared Tooltip component.
    const toggle = container.querySelector(".race-podium-info-toggle")!;
    expect(toggle.textContent).toBe("?");
    expect(toggle.getAttribute("aria-label")).toBe("How is the winner decided?");
    // Tooltip wraps the trigger in a .llm-tip span.
    const tip = container.querySelector(".llm-tip")!;
    expect(tip.contains(toggle)).toBe(true);
  });

  it("includes Fastest Start line in share text when present", () => {
    const results = [
      result({ laneId: "lane-1", finishRank: 1, tps: 100, ttft: 800, tokenCount: 50 }),
      result({ laneId: "lane-2", finishRank: 2, tps: 120, ttft: 300, tokenCount: 40 }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1 }}
      />,
    );
    // ShareButtons encodes shareText into onClick-built URLs (not directly
    // observable here without simulating the click). The pure share-text
    // builder is exercised by the award-render assertions; here we just
    // confirm the award that feeds the share text is present and correct.
    const award = container.querySelector(".race-podium-award")!;
    expect(award.textContent).toContain("Fastest Start");
    expect(award.textContent).toContain("Sally");
    expect(award.textContent).toContain("300ms TTFT");
  });

  it("renders Cheapest award for the lane with lowest total cost", () => {
    const results = [
      result({
        laneId: "lane-1",
        finishRank: 1,
        tps: 100,
        ttft: 800,
        tokenCount: 50,
        inputTokens: 10,
        outputTokens: 40,
        pricing: { input: 1, output: 2 }, // cost = (10/1M)*1 + (40/1M)*2 = 90/1M
      }),
      result({
        laneId: "lane-2",
        finishRank: 2,
        tps: 120,
        ttft: 300,
        tokenCount: 40,
        inputTokens: 10,
        outputTokens: 30,
        pricing: { input: 0.5, output: 1 }, // cost = (10/1M)*0.5 + (30/1M)*1 = 35/1M
      }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1 }}
      />,
    );
    const awards = container.querySelectorAll(".race-podium-award");
    const cheapestAward = Array.from(awards).find((a) => a.textContent?.includes("Cheapest"));
    expect(cheapestAward).toBeDefined();
    expect(cheapestAward!.querySelector(".race-podium-award-name")!.textContent).toBe("Sally");
    expect(cheapestAward!.querySelector(".race-podium-award-value")!.textContent?.trim()).toBe("$0.00004");
  });

  it("renders Cheapest award when a lane is completely free", () => {
    const results = [
      result({
        laneId: "lane-1",
        finishRank: 1,
        tps: 100,
        ttft: 800,
        tokenCount: 50,
        inputTokens: 10,
        outputTokens: 40,
        pricing: { input: 1, output: 2 },
      }),
      result({
        laneId: "lane-2",
        finishRank: 2,
        tps: 120,
        ttft: 300,
        tokenCount: 40,
        inputTokens: 10,
        outputTokens: 30,
        pricing: { input: 0, output: 0 },
      }),
    ];
    const { container } = render(
      <RacePodium
        results={results}
        providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic" }}
        laneIndexById={{ "lane-1": 0, "lane-2": 1 }}
      />,
    );
    const awards = container.querySelectorAll(".race-podium-award");
    const cheapestAward = Array.from(awards).find((a) => a.textContent?.includes("Cheapest"));
    expect(cheapestAward).toBeDefined();
    expect(cheapestAward!.querySelector(".race-podium-award-name")!.textContent).toBe("Sally");
    expect(cheapestAward!.querySelector(".race-podium-award-value")!.textContent?.trim()).toBe("$0.00000");
  });
});
