/** @jsxImportSource preact */

import { Sparkline } from "./Sparkline";

interface HeroSparklineProps {
  data: Array<{ value: number; label: string }>;
}

export function HeroSparkline({ data }: HeroSparklineProps) {
  if (data.length <= 1) return null;
  return (
    <div class="llm-hero-sparkline">
      <Sparkline data={data} width={240} height={48} strokeWidth={1.5} />
    </div>
  );
}
