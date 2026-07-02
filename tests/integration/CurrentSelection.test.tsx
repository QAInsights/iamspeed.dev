/** @jsxImportSource preact */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { CurrentSelection } from "../../src/components/CurrentSelection";
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

describe("CurrentSelection", () => {
  afterEach(() => cleanup());

  it("renders provider name and model ID", () => {
    const { container } = render(
      <CurrentSelection providerName="OpenAI" model={modelWithPricing} onClick={() => {}} />
    );
    expect(container.textContent).toContain("OpenAI");
    expect(container.textContent).toContain("gpt-4o");
  });

  it("renders pricing when available", () => {
    const { container } = render(
      <CurrentSelection providerName="OpenAI" model={modelWithPricing} onClick={() => {}} />
    );
    const pricingEl = container.querySelector(".pricing");
    expect(pricingEl).not.toBeNull();
    expect(pricingEl?.textContent?.trim()).toBe("· $5.00 / $15.00");
  });

  it('renders "No pricing" when pricing is not available', () => {
    const { container } = render(
      <CurrentSelection providerName="OpenAI" model={modelWithoutPricing} onClick={() => {}} />
    );
    const pricingEl = container.querySelector(".pricing");
    expect(pricingEl).not.toBeNull();
    expect(pricingEl?.textContent?.trim()).toBe("· No pricing");
  });

  it("does not render pricing when model is undefined", () => {
    const { container } = render(
      <CurrentSelection providerName="OpenAI" model={undefined} onClick={() => {}} />
    );
    expect(container.querySelector(".pricing")).toBeNull();
  });

  it('renders "Free" when pricing is zero', () => {
    const freeModel: ModelEntry = {
      id: "free-model",
      label: "Free Model",
      contextWindow: 1000,
      pricing: { input: 0, output: 0 },
    };
    const { container } = render(
      <CurrentSelection providerName="OpenAI" model={freeModel} onClick={() => {}} />
    );
    const pricingEl = container.querySelector(".pricing");
    expect(pricingEl).not.toBeNull();
    expect(pricingEl?.textContent?.trim()).toBe("· Free");
  });
});
