/** @jsxImportSource preact */
import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { getDeviceHash, generateHandle, getRegion } from "../lib/fingerprint";
import { TurnstileWidget } from "./TurnstileWidget";

/**
 * Inline "Submit to Leaderboard" flow shown in Simple mode after a run
 * completes. Sits next to the ShareBar.
 *
 * Uses a Blind-style auto-generated handle derived from the device hash —
 * no user input needed. The handle is deterministic: same browser always
 * gets the same handle.
 *
 * Posts to /api/leaderboard/submit by default. Pass `onSubmit` to override
 * (used for testing).
 */

interface LeaderboardSubmitProps {
  provider: string;
  model: string;
  tps: number | null;
  ttft: number | null;
  ttlt: number | null;
  /** Public Turnstile site key — omit to disable widget (e.g. local dev). */
  siteKey?: string;
  /** Override the default fetch-based submit (used for testing). */
  onSubmit?: (handle: string, deviceHash: string) => Promise<void>;
}

const style = `
  .llm-lb-submit {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    margin-top: 1rem;
  }
  .llm-lb-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.875rem;
    border: 1px solid var(--border);
    background: var(--surface);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-family: var(--mono);
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    color: var(--text-muted);
    border-radius: 6px;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, background-color 0.2s, transform 0.1s;
  }
  .llm-lb-submit-btn:hover {
    color: var(--text);
    border-color: var(--text);
    background: var(--border-light);
  }
  .llm-lb-submit-btn:active {
    transform: scale(0.96);
  }
  .llm-lb-submit-btn svg {
    width: 14px;
    height: 14px;
  }
  .llm-lb-handle-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .llm-lb-handle-label {
    font-size: 0.625rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .llm-lb-handle-value {
    font-family: var(--mono);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--accent);
  }
  .llm-lb-send {
    padding: 0.375rem 0.875rem;
    background: var(--accent);
    color: #fff;
    font-family: var(--mono);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
    transition: background-color 0.2s, transform 0.1s;
  }
  .llm-lb-send:hover {
    background: var(--accent-hover);
  }
  .llm-lb-send:active {
    transform: scale(0.96);
  }
  .llm-lb-send:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
  .llm-lb-cancel {
    font-family: var(--mono);
    font-size: 0.6875rem;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.375rem 0.25rem;
  }
  .llm-lb-cancel:hover {
    color: var(--text);
  }
  .llm-lb-msg {
    font-family: var(--mono);
    font-size: 0.6875rem;
    text-align: center;
    line-height: 1.5;
  }
  .llm-lb-msg-success {
    color: var(--accent);
  }
  .llm-lb-msg-error {
    color: #cf222e;
  }
  .llm-lb-msg a {
    color: var(--accent);
    text-decoration: underline;
  }
  .llm-lb-msg-info {
    color: var(--text-muted);
  }
`;

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export function LeaderboardSubmit({ provider, model, tps, ttft, ttlt, siteKey, onSubmit }: LeaderboardSubmitProps) {
  const [expanded, setExpanded] = useState(false);
  const [handle, setHandle] = useState<string>("");
  const [deviceHash, setDeviceHash] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const widgetRef = useRef<{ reset: () => void }>({ reset: () => {} });

  // Generate handle on mount (deterministic from device fingerprint)
  useEffect(() => {
    getDeviceHash().then((hash) => {
      setDeviceHash(hash);
      setHandle(generateHandle(hash));
    }).catch(() => {
      setHandle("anon_0000");
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!handle || !deviceHash) return;
    setStatus("submitting");
    try {
      const region = await getRegion().catch(() => "Other");

      if (onSubmit) {
        // Test / override path — skip Turnstile
        await onSubmit(handle, deviceHash);
      } else {
        const res = await fetch("/api/leaderboard/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle,
            deviceHash,
            region,
            provider,
            model,
            tps,
            ttft,
            ttlt,
            cfTurnstileToken: turnstileToken,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Submission failed");
        }
        widgetRef.current.reset();
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed. Try again.");
    }
  }, [handle, deviceHash, provider, model, tps, ttft, ttlt, turnstileToken, onSubmit]);

  if (status === "success") {
    return (
      <>
        <style>{style}</style>
        <div class="llm-lb-submit">
          <p class="llm-lb-msg llm-lb-msg-success">
            Submitted as <strong>{handle}</strong>! <a href="/leaderboard">View leaderboard &rarr;</a>
          </p>
        </div>
      </>
    );
  }

  if (!expanded) {
    return (
      <>
        <style>{style}</style>
        <div class="llm-lb-submit">
          <button class="llm-lb-submit-btn" onClick={() => setExpanded(true)} aria-label="Submit to leaderboard">
            <TrophyIcon />
            Submit to Leaderboard
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{style}</style>
      <div class="llm-lb-submit">
        <div class="llm-lb-handle-display">
          <span class="llm-lb-handle-label">Your handle</span>
          <span class="llm-lb-handle-value">{handle || "…"}</span>
          {siteKey && !onSubmit && (
            <TurnstileWidget
              siteKey={siteKey}
              onToken={setTurnstileToken}
              widgetRef={widgetRef.current}
            />
          )}
          <button
            class="llm-lb-send"
            onClick={handleSubmit}
            disabled={!handle || status === "submitting" || (!onSubmit && !!siteKey && !turnstileToken)}
          >
            {status === "submitting" ? "Submitting…" : "Submit"}
          </button>
        </div>
        <button class="llm-lb-cancel" onClick={() => { setExpanded(false); setStatus("idle"); setErrorMsg(""); }}>
          Cancel
        </button>
        {status === "error" && (
          <p class="llm-lb-msg llm-lb-msg-error" role="alert">{errorMsg}</p>
        )}
        {tps !== null && (
          <p class="llm-lb-msg llm-lb-msg-info">
            Your score: {tps.toFixed(1)} tok/s
          </p>
        )}
      </div>
    </>
  );
}
