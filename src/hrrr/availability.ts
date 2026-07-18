import type { SmokeFrame } from "./time";
import { buildLatestSmokeProbeUrl, buildSmokeTitilerUrl, type HrrrRun } from "./titiler-url";
import { HRRR_CONUS_BBOX } from "./metadata";

function runFromDate(date: Date): HrrrRun {
  return {
    date: `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`,
    hour: date.getUTCHours(),
    forecastHour: 0,
  };
}

async function probe(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD", signal });
    if (head.ok) return true;
    if (head.status !== 405) return false;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
  }

  const get = await fetch(url, { method: "GET", signal });
  return get.ok;
}

export async function isSmokeFrameAvailable(titilerBaseUrl: string, frame: SmokeFrame, signal?: AbortSignal): Promise<boolean> {
  return probe(buildSmokeTitilerUrl({ titilerBaseUrl, run: frame.run, bbox: HRRR_CONUS_BBOX }), signal);
}

export async function findLatestSmokeRun(options: {
  titilerBaseUrl: string;
  now?: Date;
  maxLookbackHours?: number;
  signal?: AbortSignal;
}): Promise<HrrrRun> {
  const { titilerBaseUrl, now = new Date(), maxLookbackHours = 36, signal } = options;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));

  for (let offset = 0; offset < maxLookbackHours; offset += 1) {
    const run = runFromDate(new Date(cursor.getTime() - offset * 60 * 60 * 1000));
    if (await probe(buildLatestSmokeProbeUrl(titilerBaseUrl, run), signal)) return run;
  }

  throw new Error(`No HRRR smoke run was available in the last ${maxLookbackHours} hours`);
}
