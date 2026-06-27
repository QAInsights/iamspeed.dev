/** @jsxImportSource preact */
import type { AppMode } from "../lib/race/storage";

interface TopBarActionsProps {
  onToggleTheme: () => void;
  onHistory: () => void;
  historyOpen: boolean;
  onSettings: () => void;
  settingsOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  mode: AppMode;
  onToggleMode: () => void;
  showHistory?: boolean;
  showSettings?: boolean;
  showModeToggle?: boolean;
}

export function TopBarActions({
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
  showSettings = true,
  showModeToggle = true,
}: TopBarActionsProps) {
  return (
    <div class="llm-topbar-actions">
      {showModeToggle && (
        <button
          class="llm-mode-toggle"
          onClick={onToggleMode}
          aria-label={mode === "race" ? "Switch to Simple mode" : "Switch to Race mode"}
          title={mode === "race" ? "Simple mode" : "Race mode"}
          aria-pressed={mode === "race"}
        >
          {mode === "race" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 21a9 9 0 1 0-9-9" />
              <path d="M12 12l4-3" />
              <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
              <path d="M5 5l1.5 1.5" />
              <path d="M2 12h2" />
              <path d="M5 19l1.5-1.5" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 21V4" />
              <path d="M5 4c4-2 8 2 12 0v8c-4 2-8-2-12 0" />
              <rect x="6.5" y="5" width="2" height="2" fill="currentColor" stroke="none" />
              <rect x="10.5" y="5" width="2" height="2" fill="currentColor" stroke="none" />
              <rect x="8.5" y="7" width="2" height="2" fill="currentColor" stroke="none" />
              <rect x="12.5" y="7" width="2" height="2" fill="currentColor" stroke="none" />
              <rect x="6.5" y="9" width="2" height="2" fill="currentColor" stroke="none" />
              <rect x="10.5" y="9" width="2" height="2" fill="currentColor" stroke="none" />
            </svg>
          )}
        </button>
      )}
      <button class="llm-sound-toggle" onClick={onToggleSound} aria-label={soundEnabled ? "Mute Sound" : "Enable Sound"}>
        {soundEnabled ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        )}
      </button>
      <button class="llm-theme-toggle" onClick={onToggleTheme} aria-label="Toggle Theme">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="theme-toggle-icon" aria-hidden="true">
          <path class="sun-icon" d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42" />
          <path class="moon-icon" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>
      <a class="llm-leaderboard-link" href="/leaderboard" aria-label="Leaderboard" title="Leaderboard">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      </a>
      {showHistory && (
        <button class="llm-history-btn" onClick={onHistory} aria-label="History" aria-expanded={historyOpen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 14" />
          </svg>
        </button>
      )}
      {showSettings && (
        <button class="llm-gear" onClick={onSettings} aria-label="Settings" aria-expanded={settingsOpen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}
    </div>
  );
}
