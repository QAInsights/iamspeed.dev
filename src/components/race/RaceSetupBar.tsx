/** @jsxImportSource preact */

interface RaceSetupBarProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  raceState: "idle" | "running" | "done" | "error";
  onStart: () => void;
  onStop: () => void;
  canStart: boolean;
}

export function RaceSetupBar({
  prompt,
  onPromptChange,
  raceState,
  onStart,
  onStop,
  canStart,
}: RaceSetupBarProps) {
  const isRunning = raceState === "running";
  return (
    <div class="race-setup">
      <input
        class="race-prompt-input"
        type="text"
        value={prompt}
        onInput={(e) => onPromptChange((e.target as HTMLInputElement).value)}
        placeholder="Same prompt. Same track. Different engines."
        disabled={isRunning}
        aria-label="Race prompt (applied to all lanes)"
      />
      {isRunning ? (
        <button class="race-btn-stop" onClick={onStop}>Stop</button>
      ) : (
        <button class="race-btn-start" onClick={onStart} disabled={!canStart}>
          {raceState === "idle" ? "Start your engines" : "Race Again"}
        </button>
      )}
    </div>
  );
}
