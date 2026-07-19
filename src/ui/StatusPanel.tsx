import type { AppStatus } from "../app-state";
import { SmokehrrrLogo } from "./SmokehrrrLogo";
import { SourceLinks } from "./SourceLinks";

export function statusText(status: AppStatus): string {
  if (status.state === "ready") {
    return `${status.variable} · ${status.frame.label}`;
  }
  return status.message;
}

export function StatusPanel({
  status,
  theme,
  onInfoClick,
  onThemeToggle,
}: {
  status: AppStatus;
  theme: "dark" | "light";
  onInfoClick: () => void;
  onThemeToggle: () => void;
}) {
  return (
    <section className="panel status-panel" aria-live="polite">
      <div className="status-actions">
        <button className="status-icon-button" type="button" aria-label="Show Smokehrrr information" onClick={onInfoClick}>
          i
        </button>
        <button
          className="status-icon-button theme-button"
          type="button"
          aria-label={theme === "dark" ? "Switch to light map" : "Switch to dark map"}
          title={theme === "dark" ? "Switch to light map" : "Switch to dark map"}
          onClick={onThemeToggle}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
      <h1 className="logo-heading">
        <SmokehrrrLogo />
      </h1>
      <SourceLinks />
      {status.state === "ready" ? null : (
        <p className={`status-message ${status.state}`}>{statusText(status)}</p>
      )}
    </section>
  );
}
