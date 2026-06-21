/** @jsxImportSource preact */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/preact";
import { TopBar } from "../../src/components/TopBar";

describe("TopBar", () => {
  afterEach(() => cleanup());

  const defaultProps = {
    onToggleTheme: vi.fn(),
    onHistory: vi.fn(),
    historyOpen: false,
    onSettings: vi.fn(),
    settingsOpen: false,
    soundEnabled: true,
    onToggleSound: vi.fn(),
    mode: "simple" as const,
    onToggleMode: vi.fn(),
  };

  it("renders brand name and logo", () => {
    const { container } = render(<TopBar {...defaultProps} />);
    expect(container.querySelector(".llm-brand-name")!.textContent).toBe("I am speed.");
    expect(container.querySelector(".llm-brand-logo img")).toBeTruthy();
  });

  it("shows 'measure what matters.' tagline in simple mode", () => {
    const { container } = render(<TopBar {...defaultProps} mode="simple" />);
    expect(container.querySelector(".llm-brand-tagline")!.textContent).toBe("measure what matters.");
  });

  it("shows 'race what matters.' tagline in race mode", () => {
    const { container } = render(<TopBar {...defaultProps} mode="race" />);
    expect(container.querySelector(".llm-brand-tagline")!.textContent).toBe("race what matters.");
  });

  it("renders mode toggle button", () => {
    const { container } = render(<TopBar {...defaultProps} />);
    expect(container.querySelector(".llm-mode-toggle")).toBeTruthy();
  });

  it("calls onToggleMode when mode toggle clicked", () => {
    const onToggleMode = vi.fn();
    const { container } = render(<TopBar {...defaultProps} onToggleMode={onToggleMode} />);
    fireEvent.click(container.querySelector(".llm-mode-toggle")!);
    expect(onToggleMode).toHaveBeenCalledOnce();
  });

  it("shows history button when showHistory is true", () => {
    const { container } = render(<TopBar {...defaultProps} showHistory={true} />);
    expect(container.querySelector(".llm-history-btn")).toBeTruthy();
  });

  it("hides history button when showHistory is false", () => {
    const { container } = render(<TopBar {...defaultProps} showHistory={false} />);
    expect(container.querySelector(".llm-history-btn")).toBeNull();
  });

  it("defaults showHistory to true when not provided", () => {
    const { container } = render(<TopBar {...defaultProps} />);
    expect(container.querySelector(".llm-history-btn")).toBeTruthy();
  });

  it("renders settings button", () => {
    const { container } = render(<TopBar {...defaultProps} />);
    expect(container.querySelector(".llm-gear")).toBeTruthy();
  });

  it("renders sound toggle button", () => {
    const { container } = render(<TopBar {...defaultProps} />);
    expect(container.querySelector(".llm-sound-toggle")).toBeTruthy();
  });

  it("renders theme toggle button", () => {
    const { container } = render(<TopBar {...defaultProps} />);
    expect(container.querySelector(".llm-theme-toggle")).toBeTruthy();
  });
});
