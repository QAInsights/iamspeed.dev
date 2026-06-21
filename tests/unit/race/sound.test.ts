import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need to reset the module-level audioCtx between tests, so use dynamic imports
// with vi.resetModules() in beforeEach.

async function importSound() {
  vi.resetModules();
  return await import("../../../src/lib/race/sound");
}

describe("race/sound", () => {
  let savedWindow: typeof globalThis.window | undefined;
  let savedAudioContext: typeof globalThis.AudioContext | undefined;

  beforeEach(() => {
    savedWindow = globalThis.window;
    savedAudioContext = globalThis.AudioContext;
  });

  afterEach(() => {
    if (savedWindow === undefined) {
      // @ts-expect-error restore
      delete globalThis.window;
    } else {
      globalThis.window = savedWindow;
    }
    if (savedAudioContext === undefined) {
      // @ts-expect-error restore
      delete globalThis.AudioContext;
    } else {
      globalThis.AudioContext = savedAudioContext;
    }
    vi.restoreAllMocks();
  });

  describe("playRev", () => {
    it("no-ops when window is undefined", async () => {
      // @ts-expect-error simulate no window
      delete globalThis.window;
      const { playRev } = await importSound();
      expect(() => playRev()).not.toThrow();
    });

    it("no-ops when AudioContext is not available", async () => {
      globalThis.window = {} as typeof window;
      // @ts-expect-error no AudioContext
      delete globalThis.AudioContext;
      const { playRev } = await importSound();
      expect(() => playRev()).not.toThrow();
    });

    it("creates oscillator and gain when AudioContext is available", async () => {
      const createOscillator = vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        type: "",
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }));
      const createGain = vi.fn(() => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }));
      const mockCtx = {
        currentTime: 0,
        destination: {},
        createOscillator,
        createGain,
        state: "running",
        resume: vi.fn(),
      };
      const MockAC = vi.fn(() => mockCtx) as unknown as typeof AudioContext;
      globalThis.window = { AudioContext: MockAC } as unknown as typeof window;

      const { playRev } = await importSound();
      playRev();

      expect(createOscillator).toHaveBeenCalledOnce();
      expect(createGain).toHaveBeenCalledOnce();
      const osc = createOscillator.mock.results[0].value;
      expect(osc.type).toBe("sawtooth");
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(80, 0);
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    });

    it("resumes suspended AudioContext", async () => {
      const createOscillator = vi.fn(() => ({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        type: "", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }));
      const createGain = vi.fn(() => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }));
      const mockCtx = {
        currentTime: 0, destination: {}, createOscillator, createGain,
        state: "suspended", resume: vi.fn(),
      };
      const MockAC = vi.fn(() => mockCtx) as unknown as typeof AudioContext;
      globalThis.window = { AudioContext: MockAC } as unknown as typeof window;

      const { playRev } = await importSound();
      playRev();
      expect(mockCtx.resume).toHaveBeenCalled();
    });

    it("no-ops when AudioContext constructor throws", async () => {
      const MockAC = vi.fn(() => { throw new Error("AudioContext boom"); }) as unknown as typeof AudioContext;
      globalThis.window = { AudioContext: MockAC } as unknown as typeof window;

      const { playRev } = await importSound();
      // Should not throw — getCtx catches construction errors
      expect(() => playRev()).not.toThrow();
    });
  });

  describe("playFinish", () => {
    it("no-ops when window is undefined", async () => {
      // @ts-expect-error simulate no window
      delete globalThis.window;
      const { playFinish } = await importSound();
      expect(() => playFinish()).not.toThrow();
    });

    it("no-ops when AudioContext is not available", async () => {
      globalThis.window = {} as typeof window;
      const { playFinish } = await importSound();
      expect(() => playFinish()).not.toThrow();
    });

    it("creates noise buffer, filter, and gain when AudioContext is available", async () => {
      const createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(100) }));
      const createBufferSource = vi.fn(() => ({
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(), buffer: null,
      }));
      const createBiquadFilter = vi.fn(() => ({
        connect: vi.fn(), type: "", frequency: { value: 0 },
      }));
      const createGain = vi.fn(() => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }));
      const mockCtx = {
        currentTime: 0, sampleRate: 44100, destination: {},
        createBuffer, createBufferSource, createBiquadFilter, createGain,
        state: "running", resume: vi.fn(),
      };
      const MockAC = vi.fn(() => mockCtx) as unknown as typeof AudioContext;
      globalThis.window = { AudioContext: MockAC } as unknown as typeof window;

      const { playFinish } = await importSound();
      playFinish();

      expect(createBuffer).toHaveBeenCalledOnce();
      expect(createBufferSource).toHaveBeenCalledOnce();
      expect(createBiquadFilter).toHaveBeenCalledOnce();
      expect(createGain).toHaveBeenCalledOnce();
      const filter = createBiquadFilter.mock.results[0].value;
      expect(filter.type).toBe("bandpass");
    });

    it("no-ops when AudioContext constructor throws", async () => {
      const MockAC = vi.fn(() => { throw new Error("boom"); }) as unknown as typeof AudioContext;
      globalThis.window = { AudioContext: MockAC } as unknown as typeof window;

      const { playFinish } = await importSound();
      expect(() => playFinish()).not.toThrow();
    });
  });
});
