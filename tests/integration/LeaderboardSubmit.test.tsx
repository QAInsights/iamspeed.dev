/** @jsxImportSource preact */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import { LeaderboardSubmit } from "../../src/components/LeaderboardSubmit";

describe("LeaderboardSubmit", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const defaultProps = {
    provider: "openai",
    model: "gpt-4o",
    tps: 120.5,
    ttft: 250,
    ttlt: 3000,
  };

  it("renders submit button in collapsed state", () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} />);
    expect(container.querySelector(".llm-lb-submit-btn")).toBeTruthy();
    expect(container.querySelector(".llm-lb-submit-btn")!.textContent).toContain("Submit to Leaderboard");
  });

  it("expands to show handle when button clicked", async () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);

    await waitFor(() => {
      expect(container.querySelector(".llm-lb-handle-display")).toBeTruthy();
    });
    expect(container.querySelector(".llm-lb-handle-label")!.textContent).toBe("Your handle");
  });

  it("shows submit button in expanded state", async () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);

    await waitFor(() => {
      expect(container.querySelector(".llm-lb-send")).toBeTruthy();
    });
    expect(container.querySelector(".llm-lb-send")!.textContent).toBe("Submit");
  });

  it("shows cancel button in expanded state", async () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);

    await waitFor(() => {
      expect(container.querySelector(".llm-lb-cancel")).toBeTruthy();
    });
  });

  it("collapses back when cancel is clicked", async () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);
    await waitFor(() => expect(container.querySelector(".llm-lb-cancel")).toBeTruthy());

    fireEvent.click(container.querySelector(".llm-lb-cancel")!);

    await waitFor(() => {
      expect(container.querySelector(".llm-lb-handle-display")).toBeNull();
      expect(container.querySelector(".llm-lb-submit-btn")).toBeTruthy();
    });
  });

  it("shows success message after successful submit via onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<LeaderboardSubmit {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);
    // Wait for handle to be generated (async crypto)
    await waitFor(() => {
      const handleEl = container.querySelector(".llm-lb-handle-value");
      expect(handleEl).toBeTruthy();
      expect(handleEl!.textContent).not.toBe("…");
    });

    fireEvent.click(container.querySelector(".llm-lb-send")!);

    await waitFor(() => {
      expect(container.querySelector(".llm-lb-msg-success")).toBeTruthy();
    });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("shows error message when onSubmit throws", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Server down"));
    const { container } = render(<LeaderboardSubmit {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);
    await waitFor(() => {
      const handleEl = container.querySelector(".llm-lb-handle-value");
      expect(handleEl).toBeTruthy();
      expect(handleEl!.textContent).not.toBe("…");
    });

    fireEvent.click(container.querySelector(".llm-lb-send")!);

    await waitFor(() => {
      expect(container.querySelector(".llm-lb-msg-error")).toBeTruthy();
    });
    expect(container.querySelector(".llm-lb-msg-error")!.textContent).toContain("Server down");
  });

  it("shows score info when tps is not null", async () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} tps={99.9} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);
    await waitFor(() => expect(container.querySelector(".llm-lb-send")).toBeTruthy());

    const infoMsg = container.querySelector(".llm-lb-msg-info");
    expect(infoMsg).toBeTruthy();
    expect(infoMsg!.textContent).toContain("99.9");
  });

  it("does not show score info when tps is null", async () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} tps={null} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);
    await waitFor(() => expect(container.querySelector(".llm-lb-send")).toBeTruthy());

    expect(container.querySelector(".llm-lb-msg-info")).toBeNull();
  });

  it("disables submit button while submitting", async () => {
    let resolveSubmit: () => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((resolve) => { resolveSubmit = resolve; }));
    const { container } = render(<LeaderboardSubmit {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);
    await waitFor(() => {
      const handleEl = container.querySelector(".llm-lb-handle-value");
      expect(handleEl).toBeTruthy();
      expect(handleEl!.textContent).not.toBe("…");
    });

    fireEvent.click(container.querySelector(".llm-lb-send")!);

    await waitFor(() => {
      const sendBtn = container.querySelector(".llm-lb-send") as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(true);
      expect(sendBtn.textContent).toBe("Submitting…");
    });

    resolveSubmit!();
  });

  it("success message includes link to leaderboard", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<LeaderboardSubmit {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);
    await waitFor(() => {
      const handleEl = container.querySelector(".llm-lb-handle-value");
      expect(handleEl).toBeTruthy();
      expect(handleEl!.textContent).not.toBe("…");
    });

    fireEvent.click(container.querySelector(".llm-lb-send")!);

    await waitFor(() => {
      const link = container.querySelector(".llm-lb-msg-success a");
      expect(link).toBeTruthy();
      expect(link!.getAttribute("href")).toBe("/leaderboard");
    });
  });

  it("generates a handle on mount", async () => {
    const { container } = render(<LeaderboardSubmit {...defaultProps} />);
    fireEvent.click(container.querySelector(".llm-lb-submit-btn")!);

    await waitFor(() => {
      const handleEl = container.querySelector(".llm-lb-handle-value");
      expect(handleEl).toBeTruthy();
      expect(handleEl!.textContent).not.toBe("…");
      expect(handleEl!.textContent!.length).toBeGreaterThan(0);
    });
  });
});
