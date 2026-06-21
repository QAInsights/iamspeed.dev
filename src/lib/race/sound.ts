/**
 * Race Mode sound effects — Web Audio synthesis, same pattern as audio.ts.
 * No new dependencies. Gracefully no-ops if AudioContext is unavailable.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/**
 * Engine rev at race start. A short rising sawtooth ramp ~600ms.
 */
export function playRev(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.5);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.start(now);
    osc.stop(now + 0.65);
  } catch (e) {
    console.warn("playRev failed:", e);
  }
}

/**
 * Finish-line tire screech when the first lane crosses. A short noise burst
 * with a quick decay — reads as a skid/checkered-flag moment.
 */
export function playFinish(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    noise.start(now);
    noise.stop(now + 0.25);
  } catch (e) {
    console.warn("playFinish failed:", e);
  }
}
