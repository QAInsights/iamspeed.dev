/** @jsxImportSource preact */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/preact";
import { TopBarActions } from "../../src/components/TopBarActions";

describe("TopBarActions", () => {
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

  describe("mode toggle button", () => {
    it("renders mode toggle button", () => {
      const { container } = render(<TopBarActions {...defaultProps} />);
      expect(container.querySelector(".llm-mode-toggle")).toBeTruthy();
    });

    it("has aria-label 'Switch to Race mode' in simple mode", () => {
      const { container } = render(<TopBarActions {...defaultProps} mode="simple" />);
      expect(container.querySelector(".llm-mode-toggle")!.getAttribute("aria-label")).toBe("Switch to Race mode");
    });

    it("has aria-label 'Switch to Simple mode' in race mode", () => {
      const { container } = render(<TopBarActions {...defaultProps} mode="race" />);
      expect(container.querySelector(".llm-mode-toggle")!.getAttribute("aria-label")).toBe("Switch to Simple mode");
    });

    it("has aria-pressed false in simple mode", () => {
      const { container } = render(<TopBarActions {...defaultProps} mode="simple" />);
      expect(container.querySelector(".llm-mode-toggle")!.getAttribute("aria-pressed")).toBe("false");
    });

    it("has aria-pressed true in race mode", () => {
      const { container } = render(<TopBarActions {...defaultProps} mode="race" />);
      expect(container.querySelector(".llm-mode-toggle")!.getAttribute("aria-pressed")).toBe("true");
    });

    it("calls onToggleMode when clicked", () => {
      const onToggleMode = vi.fn();
      const { container } = render(<TopBarActions {...defaultProps} onToggleMode={onToggleMode} />);
      fireEvent.click(container.querySelector(".llm-mode-toggle")!);
      expect(onToggleMode).toHaveBeenCalledOnce();
    });

    it("has title 'Race mode' in simple mode", () => {
      const { container } = render(<TopBarActions {...defaultProps} mode="simple" />);
      expect(container.querySelector(".llm-mode-toggle")!.getAttribute("title")).toBe("Race mode");
    });

    it("has title 'Simple mode' in race mode", () => {
      const { container } = render(<TopBarActions {...defaultProps} mode="race" />);
      expect(container.querySelector(".llm-mode-toggle")!.getAttribute("title")).toBe("Simple mode");
    });
  });

  describe("history button conditional", () => {
    it("shows history button when showHistory is true", () => {
      const { container } = render(<TopBarActions {...defaultProps} showHistory={true} />);
      expect(container.querySelector(".llm-history-btn")).toBeTruthy();
    });

    it("hides history button when showHistory is false", () => {
      const { container } = render(<TopBarActions {...defaultProps} showHistory={false} />);
      expect(container.querySelector(".llm-history-btn")).toBeNull();
    });

    it("defaults to showing history button when showHistory not provided", () => {
      const { container } = render(<TopBarActions {...defaultProps} />);
      expect(container.querySelector(".llm-history-btn")).toBeTruthy();
    });
  });

  describe("other buttons", () => {
    it("renders sound, theme, and settings buttons", () => {
      const { container } = render(<TopBarActions {...defaultProps} />);
      expect(container.querySelector(".llm-sound-toggle")).toBeTruthy();
      expect(container.querySelector(".llm-theme-toggle")).toBeTruthy();
      expect(container.querySelector(".llm-gear")).toBeTruthy();
    });

    it("calls onToggleSound when sound button clicked", () => {
      const onToggleSound = vi.fn();
      const { container } = render(<TopBarActions {...defaultProps} onToggleSound={onToggleSound} />);
      fireEvent.click(container.querySelector(".llm-sound-toggle")!);
      expect(onToggleSound).toHaveBeenCalledOnce();
    });

    it("calls onToggleTheme when theme button clicked", () => {
      const onToggleTheme = vi.fn();
      const { container } = render(<TopBarActions {...defaultProps} onToggleTheme={onToggleTheme} />);
      fireEvent.click(container.querySelector(".llm-theme-toggle")!);
      expect(onToggleTheme).toHaveBeenCalledOnce();
    });

    it("calls onSettings when settings button clicked", () => {
      const onSettings = vi.fn();
      const { container } = render(<TopBarActions {...defaultProps} onSettings={onSettings} />);
      fireEvent.click(container.querySelector(".llm-gear")!);
      expect(onSettings).toHaveBeenCalledOnce();
    });

    it("calls onHistory when history button clicked", () => {
      const onHistory = vi.fn();
      const { container } = render(<TopBarActions {...defaultProps} onHistory={onHistory} showHistory={true} />);
      fireEvent.click(container.querySelector(".llm-history-btn")!);
      expect(onHistory).toHaveBeenCalledOnce();
    });
  });
});
