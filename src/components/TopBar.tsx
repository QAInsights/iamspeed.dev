/** @jsxImportSource preact */
import { TopBarActions } from "./TopBarActions";
import type { AppMode } from "../lib/race/storage";

interface TopBarProps {
  onToggleTheme: () => void;
  onHistory: () => void;
  historyOpen: boolean;
  onSettings: () => void;
  settingsOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  mode: AppMode;
  onToggleMode: () => void;
  /** Hide the history button in modes that don't have it (e.g. race MVP). */
  showHistory?: boolean;
}

export function TopBar({
  onToggleTheme,
  onHistory,
  historyOpen,
  onSettings,
  settingsOpen,
  soundEnabled,
  onToggleSound,
  mode,
  onToggleMode,
  showHistory = true,
}: TopBarProps) {
  return (
    <div class="llm-topbar">
      <span class="llm-brand">
        <span class="llm-brand-logo">
          <img src="/logo.svg" alt="I am speed" />
        </span>
        <span class="llm-brand-text">
          <h1 class="llm-brand-name">I am speed.</h1>
          <span class="llm-brand-tagline">
            {mode === "race" ? "race what matters." : "measure what matters."}
          </span>
        </span>
      </span>
      <TopBarActions
        onToggleTheme={onToggleTheme}
        onHistory={onHistory}
        historyOpen={historyOpen}
        onSettings={onSettings}
        settingsOpen={settingsOpen}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        mode={mode}
        onToggleMode={onToggleMode}
        showHistory={showHistory}
      />
    </div>
  );
}
