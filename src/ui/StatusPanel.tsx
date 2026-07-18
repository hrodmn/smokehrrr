import type { AppStatus } from "../app-state";
import { HRRR_SOURCE_NAME } from "../hrrr/metadata";
import { formatUtcHour, hrrrRunTime } from "../hrrr/time";

export function statusText(status: AppStatus): string {
  if (status.state === "ready") {
    return `${status.variable} · ${status.frame.label}`;
  }
  return status.message;
}

export function StatusPanel({ status }: { status: AppStatus }) {
  const frame = status.state === "ready" ? status.frame : null;

  return (
    <section className="panel status-panel" aria-live="polite">
      <p className="eyebrow">Smokehrrr</p>
      <h1>HRRR smoke timeline</h1>
      <dl>
        <dt>Source</dt>
        <dd>{HRRR_SOURCE_NAME}</dd>
        <dt>Status</dt>
        <dd className={status.state}>{statusText(status)}</dd>
        {frame ? (
          <>
            <dt>Run</dt>
            <dd>{formatUtcHour(hrrrRunTime(frame.run))}</dd>
            <dt>Valid</dt>
            <dd>{formatUtcHour(frame.validTime)}</dd>
          </>
        ) : null}
      </dl>
      {frame?.kind === "forecast" ? <p className="forecast-note">Forecast frames are model guidance, not observed smoke.</p> : null}
    </section>
  );
}
