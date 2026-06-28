/** @jsxImportSource preact */
import { useState, useCallback } from "preact/hooks";
import { TopBar } from "./TopBar";
import { LeaderboardTable } from "./LeaderboardTable";
import { StatsBar } from "./StatsBar";
import { Footer } from "./Footer";
import { loadMode, type AppMode } from "../lib/race/storage";
import { CarSilhouette } from "./CarSilhouette";

/**
 * Standalone leaderboard page. Reuses the exact same TopBar + TopBarActions
 * components as the home page so the top bar is visually identical.
 * Sound/theme state is localStorage-backed, just like the main app.
 * History, settings, and mode toggle are hidden (not applicable here).
 */

const style = `
  .llm-lb-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    gap: 1rem;
  }
`;

export function LeaderboardPage() {
  const [, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }
    return "light";
  });
  const [mode] = useState<AppMode>(() => loadMode());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("iamspeed_sound") !== "false";
    }
    return true;
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("iamspeed_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("iamspeed_sound", String(next));
      return next;
    });
  }, []);

  const noop = useCallback(() => {}, []);

  return (
    <>
      <style>{style}</style>
      <div class="llm-lb-page">
        <TopBar
          onToggleTheme={toggleTheme}
          onHistory={noop}
          historyOpen={false}
          onSettings={noop}
          settingsOpen={false}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          mode={mode}
          onToggleMode={noop}
          showHistory={false}
          showSettings={false}
          showModeToggle={false}
        />

        <StatsBar />
        <LeaderboardTable />

        {/* Futuristic Car Silhouette */}
        <CarSilhouette idSuffix="-lb" />

        <Footer />
      </div>
    </>
  );
}
