/** @jsxImportSource preact */
import { ShareButtons, SITE_URL } from "./ShareButtons";

interface ShareBarProps {
  provider: string;
  model: string;
  tps: number | null;
  ttft: number | null;
}

function buildShareText(provider: string, model: string, tps: number | null, ttft: number | null): string {
  const tpsStr = tps !== null ? `${tps} tok/s` : "-- tok/s";
  const ttftStr = ttft !== null ? `${Math.round(ttft)}ms TTFT` : "-- TTFT";
  return `🚀 ${provider} ${model} 📊 ${tpsStr}, ${ttftStr} on iamspeed.dev\n\n${SITE_URL}`;
}

export function ShareBar({ provider, model, tps, ttft }: ShareBarProps) {
  const shareText = buildShareText(provider, model, tps, ttft);
  return <ShareButtons shareText={shareText} />;
}
