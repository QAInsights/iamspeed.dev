/** @jsxImportSource preact */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { SecondaryMetrics } from "../../src/components/SecondaryMetrics";
import type { ModelEntry } from "../../src/lib/modelRegistry";

const modelWithPricing: ModelEntry = {
  id: "gpt-4o",
  label: "GPT-4o",
  contextWindow: 128000,
  pricing: {
    input: 5,
    output: 15,
  },
};

const modelWithoutPricing: ModelEntry = {
  id: "gpt-4o-mini",
  label: "GPT-4o Mini",
  contextWindow: 128000,
};

describe("SecondaryMetrics", () => {
  afterEach(() => cleanup());

  it("renders input, output, and TTLT", () => {
    const { container } = render(
      <SecondaryMetrics
        inputTokens={10}
        outputTokens={20}
        totalTime={1000}
        model={modelWithPricing}
        tps={50}
      />
    );
    expect(container.textContent).toContain("10");
    expect(container.textContent).toContain("20");
    expect(container.textContent).toContain("1000ms");
  });

  it("renders value score when tps and pricing are available", () => {
    const { container } = render(
      <SecondaryMetrics
        inputTokens={10}
        outputTokens={20}
        totalTime={1000}
        model={modelWithPricing}
        tps={50}
      />
    );
    const valueScoreEl = Array.from(container.querySelectorAll(".llm-sec-item")).find((el) =>
      el.textContent?.includes("TPS/$")
    );
    expect(valueScoreEl).not.toBeNull();
    expect(valueScoreEl?.querySelector(".llm-sec-value")?.textContent).toBe("3,333,333"); // 50 / (15 / 1_000_000)
  });

  it("renders infinity for value score when model is free", () => {
    const freeModel: ModelEntry = {
      id: "free-model",
      label: "Free Model",
      contextWindow: 1000,
      pricing: { input: 0, output: 0 },
    };
    const { container } = render(
      <SecondaryMetrics
        inputTokens={10}
        outputTokens={20}
        totalTime={1000}
        model={freeModel}
        tps={50}
      />
    );
    const valueScoreEl = Array.from(container.querySelectorAll(".llm-sec-item")).find((el) =>
      el.textContent?.includes("TPS/$")
    );
    expect(valueScoreEl).not.toBeNull();
    expect(valueScoreEl?.querySelector(".llm-sec-value")?.textContent).toBe("∞");
  });

  it("does not render value score when tps is null", () => {
    const { container } = render(
      <SecondaryMetrics
        inputTokens={10}
        outputTokens={20}
        totalTime={1000}
        model={modelWithPricing}
        tps={null}
      />
    );
    const valueScoreEl = Array.from(container.querySelectorAll(".llm-sec-item")).find((el) =>
      el.textContent?.includes("TPS/$")
    );
    expect(valueScoreEl).toBeUndefined();
  });

  it("does not render value score when pricing is not available", () => {
    const { container } = render(
      <SecondaryMetrics
        inputTokens={10}
        outputTokens={20}
        totalTime={1000}
        model={modelWithoutPricing}
        tps={50}
      />
    );
    const valueScoreEl = Array.from(container.querySelectorAll(".llm-sec-item")).find((el) =>
      el.textContent?.includes("TPS/$")
    );
    expect(valueScoreEl).toBeUndefined();
  });
});
