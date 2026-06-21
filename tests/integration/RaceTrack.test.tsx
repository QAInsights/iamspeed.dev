/** @jsxImportSource preact */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { RaceTrack } from "../../src/components/race/RaceTrack";
import type { LaneState } from "../../src/lib/race/types";

function lane(laneId: string, overrides: Partial<LaneState> = {}): LaneState {
  return {
    laneId,
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

describe("RaceTrack", () => {
  afterEach(() => cleanup());

  it("renders a group with aria-label", () => {
    const { container } = render(<RaceTrack lanes={[]} providerNames={{}} />);
    const group = container.querySelector(".race-track");
    expect(group).toBeTruthy();
    expect(group!.getAttribute("role")).toBe("group");
    expect(group!.getAttribute("aria-label")).toBe("Race track");
  });

  it("renders no lanes when lanes is empty", () => {
    const { container } = render(<RaceTrack lanes={[]} providerNames={{}} />);
    expect(container.querySelectorAll(".race-track-lane")).toHaveLength(0);
  });

  it("renders one lane per racer", () => {
    const lanes = [lane("lane-1"), lane("lane-2"), lane("lane-3")];
    const { container } = render(<RaceTrack lanes={lanes} providerNames={{}} />);
    expect(container.querySelectorAll(".race-track-lane")).toHaveLength(3);
  });

  it("passes provider display name to each lane", () => {
    const lanes = [lane("lane-1"), lane("lane-2")];
    const { container } = render(
      <RaceTrack lanes={lanes} providerNames={{ "lane-1": "OpenAI", "lane-2": "Anthropic" }} />,
    );
    const models = container.querySelectorAll(".race-track-lane-model");
    expect(models[0].textContent).toContain("OpenAI");
    expect(models[1].textContent).toContain("Anthropic");
  });

  it("falls back to providerId when no display name", () => {
    const lanes = [lane("lane-1", { providerId: "groq" })];
    const { container } = render(<RaceTrack lanes={lanes} providerNames={{}} />);
    expect(container.querySelector(".race-track-lane-model")!.textContent).toContain("groq");
  });

  it("assigns correct lane index for colors", () => {
    const lanes = [lane("lane-1"), lane("lane-2"), lane("lane-3")];
    const { container } = render(<RaceTrack lanes={lanes} providerNames={{}} />);
    const names = container.querySelectorAll(".race-track-lane-name");
    expect(names[0].textContent).toBe("McQueen");
    expect(names[1].textContent).toBe("Sally");
    expect(names[2].textContent).toBe("Chick");
  });

  it("uses laneId as key (no duplicate key warnings)", () => {
    const lanes = [lane("lane-1"), lane("lane-2")];
    const { container } = render(<RaceTrack lanes={lanes} providerNames={{}} />);
    expect(container.querySelectorAll(".race-track-lane")).toHaveLength(2);
  });
});
