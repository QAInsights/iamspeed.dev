import { getSpeedGrade } from "./grade";

export interface ShareCardOptions {
  tps: number;
  ttft: number;
  provider: string;
  model: string;
  handle?: string;
}

/**
 * Renders a premium, screenshot-worthy benchmark result card using HTML Canvas.
 * Generates a 1200x630 (standard OpenGraph size) PNG blob.
 */
export async function generateShareCard(opts: ShareCardOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2d context");
  }

  const grade = getSpeedGrade(opts.tps);

  // 1. Draw a beautiful dark space gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  bgGrad.addColorStop(0, "#080b11");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#1e1b4b"); // Subtle purple tint in corner
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // 2. Draw glowing background grid lines/dots for a high-tech vibe
  ctx.strokeStyle = "rgba(99, 102, 241, 0.05)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < 1200; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 630);
    ctx.stroke();
  }
  for (let y = 0; y < 630; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // 3. Draw a glowing accent border / frame
  const borderGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  borderGrad.addColorStop(0, "#3b82f6"); // blue
  borderGrad.addColorStop(0.5, "#8b5cf6"); // purple
  borderGrad.addColorStop(1, "#ec4899"); // pink
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 1192, 622);

  // 4. Site Branding top-left
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("⚡", 60, 75);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillText("iamspeed.dev", 95, 73);

  // 5. Speed Grade Badge (top-right)
  ctx.save();
  const badgeText = `${grade.emoji} ${grade.label.toUpperCase()}`;
  ctx.font = "bold 18px 'JetBrains Mono', 'Courier New', monospace";
  const badgeWidth = ctx.measureText(badgeText).width + 30;
  const badgeHeight = 40;
  const badgeX = 1200 - 60 - badgeWidth;
  const badgeY = 50;

  // Badge background
  ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
  ctx.strokeStyle = grade.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
  ctx.fill();
  ctx.stroke();

  // Badge text
  ctx.fillStyle = grade.color;
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + 15, badgeY + badgeHeight / 2);
  ctx.restore();

  // 6. Huge Hero Metric (TPS)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 160px 'JetBrains Mono', 'Courier New', monospace";
  const tpsText = opts.tps.toFixed(1);
  ctx.fillText(tpsText, 60, 270);

  // TPS Unit label next to/under TPS
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 28px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillText("TOKENS / SEC", 60, 320);

  // 7. Info Divider Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 360);
  ctx.lineTo(1140, 360);
  ctx.stroke();

  // 8. Model & Provider info (bottom-left)
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`${opts.provider} · ${opts.model}`, 60, 420);

  // 9. TTFT Metric (bottom-left second line)
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 22px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillText("⚡ TTFT (TIME-TO-FIRST-TOKEN)", 60, 470);
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 32px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillText(`${Math.round(opts.ttft)}ms`, 60, 520);

  // 10. Secondary stats / Handle (bottom-right)
  if (opts.handle) {
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 22px 'JetBrains Mono', 'Courier New', monospace";
    ctx.fillText("👤 SUBMITTER", 800, 470);
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 32px 'JetBrains Mono', 'Courier New', monospace";
    ctx.fillText(opts.handle, 800, 520);
  }

  // 11. Watermark tag
  ctx.fillStyle = "#64748b";
  ctx.font = "16px sans-serif";
  ctx.fillText("H0 Hackathon Winner Submission", 60, 580);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, "image/png");
  });
}
