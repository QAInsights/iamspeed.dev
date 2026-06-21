/** @jsxImportSource preact */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { RaceTrackLane } from "../../src/components/race/RaceTrackLane";
import type { LaneState } from "../../src/lib/race/types";

function lane(overrides: Partial<LaneState> = {}): LaneState {
  return {
    laneId: overrides.laneId ?? "lane-1",
    providerId: overrides.providerId ?? "openai",
    modelId: overrides.modelId ?? "gpt-4o",
    status: overrides.status ?? "idle",
    tps: overrides.tps ?? null,
    ttft: overrides.ttft ?? null,
    ttlt: overrides.ttlt ?? null,
    tokenCount: overrides.tokenCount ?? 0,
    inputTokens: overrides.inputTokens ?? null,
    outputTokens: overrides.outputTokens ?? null,
    text: overrides.text ?? "",
    providerQueued: overrides.providerQueued ?? false,
    finishRank: overrides.finishRank ?? null,
    error: overrides.error,
  };
}

function carLeftPct(container: Element): string {
  const car = container.querySelector(".race-track-car") as HTMLElement;
  return car.style.left;
}

describe("RaceTrackLane", () => {
  afterEach(() => cleanup());

  it("renders lane name from LANE_COLORS by index", () => {
    const { container } = render(
      <RaceTrackLane lane={lane()} laneIndex={0} leaderTokens={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-track-lane-name")!.textContent).toBe("McQueen");
  });

  it("renders provider · model in the header", () => {
    const { container } = render(
      <RaceTrackLane lane={lane()} laneIndex={0} leaderTokens={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-track-lane-model")!.textContent).toBe("OpenAI · gpt-4o");
  });

  it("renders the start and finish lines", () => {
    const { container } = render(
      <RaceTrackLane lane={lane()} laneIndex={0} leaderTokens={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-track-start-line")).toBeTruthy();
    expect(container.querySelector(".race-track-finish-line")).toBeTruthy();
  });

  it("holds the car at the start line while running but before first token (ttft null)", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: null, tokenCount: 0 })}
        laneIndex={0}
        leaderTokens={50}
        providerDisplayName="OpenAI"
      />,
    );
    expect(carLeftPct(container)).toBe("0%");
  });

  it("shows 'Waiting for first token…' status while running and no ttft", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: null })}
        laneIndex={0}
        leaderTokens={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-track-lane-status")!.textContent).toContain(
      "Waiting for first token",
    );
  });

  it("shows 'Queued at provider…' when providerQueued and no ttft", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: null, providerQueued: true })}
        laneIndex={0}
        leaderTokens={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-track-lane-status")!.textContent).toContain(
      "Queued at provider",
    );
  });

  it("advances the car as tokenCount grows, capped at 0.92 while running", () => {
    // Leader with 100 tokens, this lane has 50 → 50% progress.
    const { container: c1 } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: 200, tokenCount: 50 })}
        laneIndex={0}
        leaderTokens={100}
        providerDisplayName="OpenAI"
      />,
    );
    expect(carLeftPct(c1)).toBe("50%");

    // Leader itself (tokenCount === leaderTokens) → 100% raw, capped at 92%.
    const { container: c2 } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: 200, tokenCount: 100 })}
        laneIndex={0}
        leaderTokens={100}
        providerDisplayName="OpenAI"
      />,
    );
    expect(carLeftPct(c2)).toBe("92%");
  });

  it("locks the car at 100% when done with tokens", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "done", ttft: 200, ttlt: 2000, tokenCount: 80, finishRank: 1 })}
        laneIndex={0}
        leaderTokens={80}
        providerDisplayName="OpenAI"
      />,
    );
    expect(carLeftPct(container)).toBe("100%");
  });

  it("shows the medal for finished lanes", () => {
    const { container: c1 } = render(
      <RaceTrackLane
        lane={lane({ status: "done", tokenCount: 80, finishRank: 1 })}
        laneIndex={0}
        leaderTokens={80}
        providerDisplayName="OpenAI"
      />,
    );
    expect(c1.querySelector(".race-track-lane-medal")!.textContent).toBe("🏆");

    const { container: c2 } = render(
      <RaceTrackLane
        lane={lane({ status: "done", tokenCount: 60, finishRank: 2 })}
        laneIndex={1}
        leaderTokens={80}
        providerDisplayName="Anthropic"
      />,
    );
    expect(c2.querySelector(".race-track-lane-medal")!.textContent).toBe("🥈");
  });

  it("shows Ka-chow! for the winner (rank 1, done)", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "done", tokenCount: 80, finishRank: 1 })}
        laneIndex={0}
        leaderTokens={80}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-track-lane-kachow")!.textContent).toBe("Ka-chow!");
  });

  it("keeps the car at 0% when errored with zero tokens", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "error", tokenCount: 0, error: "boom" })}
        laneIndex={0}
        leaderTokens={100}
        providerDisplayName="OpenAI"
      />,
    );
    expect(carLeftPct(container)).toBe("0%");
    expect(container.querySelector(".race-track-lane-error")!.textContent).toBe("boom");
  });

  it("renders live TPS, token count, TTFT, TTLT", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({
          status: "running",
          ttft: 450,
          ttlt: null,
          tps: 120,
          tokenCount: 50,
        })}
        laneIndex={0}
        leaderTokens={100}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-track-lane-tps-value")!.textContent).toBe("120");
    expect(container.querySelector(".race-track-lane-tokens")!.textContent).toContain("50");
    expect(container.querySelector(".race-track-lane-ttft")!.textContent).toContain("450ms");
    expect(container.querySelector(".race-track-lane-ttlt")!.textContent).toContain("--");
  });

  it("renders the streamed text preview when text is present", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: 100, text: "Hello world" })}
        laneIndex={0}
        leaderTokens={10}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-track-lane-text")!.textContent).toBe("Hello world");
  });

  it("does not render text preview when text is empty", () => {
    const { container } = render(
      <RaceTrackLane lane={lane()} laneIndex={0} leaderTokens={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-track-lane-text")).toBeNull();
  });

  it("renders the progress bar fill width matching progress", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: 200, tokenCount: 50 })}
        laneIndex={0}
        leaderTokens={100}
        providerDisplayName="OpenAI"
      />,
    );
    const fill = container.querySelector(".race-track-lane-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("50%");
  });

  it("applies the lane color CSS variable from LANE_COLORS", () => {
    const { container } = render(
      <RaceTrackLane lane={lane()} laneIndex={1} leaderTokens={0} providerDisplayName="OpenAI" />,
    );
    const laneEl = container.querySelector(".race-track-lane") as HTMLElement;
    expect(laneEl.style.getPropertyValue("--lane-color")).toBe("#1E90FF");
  });

  it("sets data-lane-id on the lane element", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ laneId: "lane-2" })}
        laneIndex={1}
        leaderTokens={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-track-lane")!.getAttribute("data-lane-id")).toBe(
      "lane-2",
    );
  });

  it("applies status modifier class", () => {
    const { container } = render(
      <RaceTrackLane
        lane={lane({ status: "running", ttft: 100 })}
        laneIndex={0}
        leaderTokens={10}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-track-lane")!.classList.contains("race-track-lane--running")).toBe(true);
  });
});
