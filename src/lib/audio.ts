let audioCtx: AudioContext | null = null;
let lastPlayTime = 0;

/**
 * Plays a short, dynamic sci-fi rolling tick/chirp sound effect.
 * Uses the Web Audio API to synthesize sound on the fly.
 * 
 * @param tps The current tokens per second, used to modulate the pitch.
 */
export function playTick(tps?: number) {
  if (typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const now = performance.now();
  // Limit tick frequency to prevent audio congestion and digital distortion.
  // 35ms matches standard sci-fi ticker rates.
  if (now - lastPlayTime < 35) {
    return;
  }
  lastPlayTime = now;

  try {
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const ctxNow = audioCtx.currentTime;

    // Additive Synthesis: Combined sharp digital click + metallic ring (chime)
    const carrier = audioCtx.createOscillator();
    const chime = audioCtx.createOscillator();
    const carrierGain = audioCtx.createGain();
    const chimeGain = audioCtx.createGain();

    carrier.connect(carrierGain);
    carrierGain.connect(audioCtx.destination);

    chime.connect(chimeGain);
    chimeGain.connect(audioCtx.destination);

    // Dynamic pitch modulation based on TPS (higher speed = higher pitched sci-fi calculations)
    const tpsBoost = tps && tps > 0 ? Math.min(600, tps * 2.5) : 0;
    const baseFreq = 1600 + tpsBoost + Math.random() * 150;

    // 1. Digital Click (gives the "robotic calculation" tick)
    carrier.type = "sine";
    carrier.frequency.setValueAtTime(baseFreq, ctxNow);
    // Rapid transient pitch sweep down
    carrier.frequency.exponentialRampToValueAtTime(200, ctxNow + 0.015);

    // Sharp attack & very fast decay (15ms)
    carrierGain.gain.setValueAtTime(0.035, ctxNow);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, ctxNow + 0.015);

    // 2. Resonant Chime (gives the metallic "cling" ring)
    // Uses an inharmonic multiplier (e.g. 2.3) for a high-pitched metal sound
    const chimeFreq = baseFreq * 2.3;
    chime.type = "sine";
    chime.frequency.setValueAtTime(chimeFreq, ctxNow);

    // Subtle volume with a longer, ringing decay (80ms)
    chimeGain.gain.setValueAtTime(0.012, ctxNow);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctxNow + 0.08);

    carrier.start(ctxNow);
    chime.start(ctxNow);

    carrier.stop(ctxNow + 0.02);
    chime.stop(ctxNow + 0.09);
  } catch (e) {
    // Gracefully handle browser autoplays or context failures without throwing
    console.warn("Failed to play rolling sound:", e);
  }
}
