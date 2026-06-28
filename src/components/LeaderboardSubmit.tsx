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
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem 0.5rem 1.75rem;
    border: none;
    background: linear-gradient(135deg, #e11d48 0%, #f97316 100%);
    color: #fff;
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-radius: 4px;
    cursor: pointer;
    transform: skewX(-12deg);
    box-shadow: 0 4px 14px rgba(225, 29, 72, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .llm-lb-submit-btn::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 10px;
    background-color: #1e293b;
    background-image: 
      linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff),
      linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff);
    background-size: 6px 6px;
    background-position: 0 0, 3px 3px;
    border-right: 1px solid rgba(0, 0, 0, 0.2);
  }
  .llm-lb-submit-btn:hover {
    transform: skewX(-12deg) scale(1.05);
    box-shadow: 0 6px 20px rgba(225, 29, 72, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    background: linear-gradient(135deg, #f43f5e 0%, #fb923c 100%);
  }
  .llm-lb-submit-btn:active {
    transform: skewX(-12deg) scale(0.98);
    box-shadow: 0 2px 8px rgba(225, 29, 72, 0.3);
  }
  .llm-lb-submit-btn-content {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transform: skewX(12deg);
  }
  .llm-lb-submit-btn svg {
    width: 14px;
    height: 14px;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
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
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1.25rem;
    border: none;
    background: linear-gradient(135deg, #e11d48 0%, #f97316 100%);
    color: #fff;
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-radius: 4px;
    cursor: pointer;
    transform: skewX(-12deg);
    box-shadow: 0 4px 14px rgba(225, 29, 72, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .llm-lb-send:hover:not(:disabled) {
    transform: skewX(-12deg) scale(1.05);
    box-shadow: 0 6px 20px rgba(225, 29, 72, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    background: linear-gradient(135deg, #f43f5e 0%, #fb923c 100%);
  }
  .llm-lb-send:active:not(:disabled) {
    transform: skewX(-12deg) scale(0.98);
    box-shadow: 0 2px 8px rgba(225, 29, 72, 0.3);
  }
  .llm-lb-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    background: var(--border-light);
    color: var(--text-muted);
  }
  .llm-lb-send-content {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    transform: skewX(12deg);
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

const CheckeredFlagIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style={{ overflow: "visible" }}>
    <path d="M4 2v20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <g transform="translate(5, 2)" fill="currentColor">
      <rect x="0" y="0" width="3" height="3" />
      <rect x="6" y="0" width="3" height="3" />
      <rect x="12" y="0" width="3" height="3" />
      <rect x="3" y="3" width="3" height="3" />
      <rect x="9" y="3" width="3" height="3" />
      <rect x="0" y="6" width="3" height="3" />
      <rect x="6" y="6" width="3" height="3" />
      <rect x="12" y="6" width="3" height="3" />
      <rect x="3" y="9" width="3" height="3" />
      <rect x="9" y="9" width="3" height="3" />
    </g>
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
            <span class="llm-lb-submit-btn-content">
              <CheckeredFlagIcon />
              Submit to Leaderboard
            </span>
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
            <span class="llm-lb-send-content">
              {status === "submitting" ? "Submitting…" : "Submit"}
            </span>
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
