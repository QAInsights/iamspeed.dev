/** @jsxImportSource preact */
import { useEffect, useRef } from "preact/hooks";

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
  widgetRef: { reset: () => void };
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({ siteKey, onToken, widgetRef }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>("");

  useEffect(() => {
    if (!containerRef.current) return;

    const render = () => {
      if (!window.turnstile || !containerRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
      widgetRef.reset = () => {
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
          onToken("");
        }
      };
    };

    // Turnstile may already be loaded or still loading
    if (window.turnstile) {
      render();
    } else {
      const script = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );
      script?.addEventListener("load", render, { once: true });
    }
  }, [siteKey]);

  return <div ref={containerRef} style={{ marginTop: "0.5rem" }} />;
}
