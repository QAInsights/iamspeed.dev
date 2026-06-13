/** @jsxImportSource preact */
import "../styles/components/WeatherBackground.css";

interface WeatherBackgroundProps {
  theme: "light" | "dark";
}

export function WeatherBackground({ theme }: WeatherBackgroundProps) {
  return (
    <div class={`weather-container ${theme}`} aria-hidden="true" />
  );
}
