import type { AppStatus } from "../app-state";
import { HRRR_SOURCE_NAME } from "../hrrr/metadata";

export function statusText(status: AppStatus): string {
  if (status.state === "ready") {
    return `${status.variable} · ${status.analysisTime}`;
  }
  return status.message;
}

export function StatusPanel({ status }: { status: AppStatus }) {
  return (
    <section className="panel status-panel" aria-live="polite">
      <p className="eyebrow">Smokehrrr</p>
      <h1>Latest HRRR smoke</h1>
      <dl>
        <dt>Source</dt>
        <dd>{HRRR_SOURCE_NAME}</dd>
        <dt>Status</dt>
        <dd className={status.state}>{statusText(status)}</dd>
      </dl>
    </section>
  );
}
