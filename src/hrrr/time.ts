import type { HrrrRun } from "./titiler-url";

export const ANALYSIS_LOOKBACK_HOURS = 24;
export const FORECAST_HORIZON_HOURS = 18;

export type SmokeFrameKind = "analysis" | "forecast";

export type SmokeFrame = {
  id: string;
  kind: SmokeFrameKind;
  run: HrrrRun;
  forecastHour: number;
  validTime: Date;
  label: string;
};

export type BuildSmokeFramesOptions = {
  latestRun: HrrrRun;
  analysisLookbackHours?: number;
  forecastHorizonHours?: number;
  formatHour?: (date: Date) => string;
};

const HOUR_MS = 60 * 60 * 1000;

export function hrrrRunTime(run: HrrrRun): Date {
  return new Date(Date.UTC(Number(run.date.slice(0, 4)), Number(run.date.slice(4, 6)) - 1, Number(run.date.slice(6, 8)), run.hour));
}

function runFromDate(date: Date, forecastHour: number): HrrrRun {
  return {
    date: `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`,
    hour: date.getUTCHours(),
    forecastHour,
  };
}

export function formatUtcHour(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}Z`;
}

export function formatViewerHour(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    timeZoneName: "short",
    ...options,
  }).format(date);
}

export function formatViewerShortHour(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    timeZoneName: "short",
  }).format(date);
}

function frameId(run: HrrrRun): string {
  return `${run.date}T${String(run.hour).padStart(2, "0")}Z-f${String(run.forecastHour).padStart(3, "0")}`;
}

export function buildSmokeFrames({
  latestRun,
  analysisLookbackHours = ANALYSIS_LOOKBACK_HOURS,
  forecastHorizonHours = FORECAST_HORIZON_HOURS,
  formatHour = formatViewerHour,
}: BuildSmokeFramesOptions): SmokeFrame[] {
  const latestRunTime = hrrrRunTime(latestRun);
  const frames: SmokeFrame[] = [];

  for (let offset = analysisLookbackHours - 1; offset >= 0; offset -= 1) {
    const time = new Date(latestRunTime.getTime() - offset * HOUR_MS);
    const run = runFromDate(time, 0);
    frames.push({
      id: frameId(run),
      kind: "analysis",
      run,
      forecastHour: 0,
      validTime: time,
      label: `Analysis · ${formatHour(time)}`,
    });
  }

  for (let forecastHour = 1; forecastHour <= forecastHorizonHours; forecastHour += 1) {
    const validTime = new Date(latestRunTime.getTime() + forecastHour * HOUR_MS);
    const run = { ...latestRun, forecastHour };
    frames.push({
      id: frameId(run),
      kind: "forecast",
      run,
      forecastHour,
      validTime,
      label: `Forecast +${forecastHour}h · valid ${formatHour(validTime)}`,
    });
  }

  return frames;
}
