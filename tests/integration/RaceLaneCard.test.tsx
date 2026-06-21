/** @jsxImportSource preact */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { RaceLaneCard } from "../../src/components/race/RaceLaneCard";
import type { LaneState } from "../../src/lib/race/types";

function lane(overrides: Partial<LaneState> & { laneId: string }): LaneState {
  return {
    laneId: overrides.laneId,
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

describe("RaceLaneCard", () => {
  afterEach(() => cleanup());

  it("renders lane number and color label", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1" })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-number")!.textContent).toBe("1");
    expect(container.querySelector(".race-lane-name")!.textContent).toBe("McQueen");
  });

  it("renders provider and model", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1", modelId: "gpt-4o" })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-model")!.textContent).toContain("OpenAI");
    expect(container.querySelector(".race-lane-model")!.textContent).toContain("gpt-4o");
  });

  it("shows -- for tps when null", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1", tps: null })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-tps-value")!.textContent).toBe("--");
  });

  it("shows tps value when set", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1", tps: 120 })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-tps-value")!.textContent).toBe("120");
  });

  it("shows -- for ttft when null", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1", ttft: null })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-ttft")!.textContent).toContain("--");
  });

  it("shows ttft in ms when set", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1", ttft: 450 })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-ttft")!.textContent).toContain("450ms");
  });

  it("shows queued status when running, queued, and no first token", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-1", status: "running", providerQueued: true, ttft: null })}
        laneIndex={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-lane-status")!.textContent).toBe("Queued at provider…");
  });

  it("shows waiting status when running, not queued, and no first token", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-1", status: "running", providerQueued: false, ttft: null })}
        laneIndex={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-lane-status")!.textContent).toBe("Waiting for first token…");
  });

  it("does not show status when first token has arrived", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-1", status: "running", ttft: 500 })}
        laneIndex={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-lane-status")).toBeNull();
  });

  it("shows streaming text when present", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1", text: "Hello world" })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-text")!.textContent).toBe("Hello world");
  });

  it("does not show text element when empty", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1", text: "" })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    expect(container.querySelector(".race-lane-text")).toBeNull();
  });

  it("shows error message when status is error", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-1", status: "error", error: "Invalid API key" })}
        laneIndex={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-lane-error")!.textContent).toBe("Invalid API key");
  });

  it("shows trophy badge for rank 1", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-1", status: "done", finishRank: 1 })}
        laneIndex={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-lane-badge")!.textContent).toBe("🏆");
  });

  it("shows silver badge for rank 2", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-2", status: "done", finishRank: 2 })}
        laneIndex={1}
        providerDisplayName="Anthropic"
      />,
    );
    expect(container.querySelector(".race-lane-badge")!.textContent).toBe("🥈");
  });

  it("shows bronze badge for rank 3", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-3", status: "done", finishRank: 3 })}
        laneIndex={2}
        providerDisplayName="Groq"
      />,
    );
    expect(container.querySelector(".race-lane-badge")!.textContent).toBe("🥉");
  });

  it("shows Ka-chow for rank 1 done lane", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-1", status: "done", finishRank: 1 })}
        laneIndex={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-lane-kachow")!.textContent).toBe("Ka-chow!");
  });

  it("does not show Ka-chow for non-rank-1 lanes", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-2", status: "done", finishRank: 2 })}
        laneIndex={1}
        providerDisplayName="Anthropic"
      />,
    );
    expect(container.querySelector(".race-lane-kachow")).toBeNull();
  });

  it("applies lane color via CSS variable", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-1" })} laneIndex={0} providerDisplayName="OpenAI" />,
    );
    const el = container.querySelector(".race-lane") as HTMLElement;
    expect(el.style.getPropertyValue("--lane-color")).toBe("#E10600");
  });

  it("uses Sally color for lane index 1", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-2" })} laneIndex={1} providerDisplayName="Anthropic" />,
    );
    expect(container.querySelector(".race-lane-name")!.textContent).toBe("Sally");
    const el = container.querySelector(".race-lane") as HTMLElement;
    expect(el.style.getPropertyValue("--lane-color")).toBe("#1E90FF");
  });

  it("uses Chick color for lane index 2", () => {
    const { container } = render(
      <RaceLaneCard lane={lane({ laneId: "lane-3" })} laneIndex={2} providerDisplayName="Groq" />,
    );
    expect(container.querySelector(".race-lane-name")!.textContent).toBe("Chick");
    const el = container.querySelector(".race-lane") as HTMLElement;
    expect(el.style.getPropertyValue("--lane-color")).toBe("#43A047");
  });

  it("applies status class to root element", () => {
    const { container } = render(
      <RaceLaneCard
        lane={lane({ laneId: "lane-1", status: "running" })}
        laneIndex={0}
        providerDisplayName="OpenAI"
      />,
    );
    expect(container.querySelector(".race-lane")!.classList.contains("race-lane--running")).toBe(true);
  });
});
