import type * as zarr from "zarrita";

export type ForecastCoordinates = {
  initTimes: readonly unknown[];
  leadTimes: readonly number[];
};

export type SmokeSelection = {
  init_time: number;
  lead_time: number;
  y: null;
  x: null;
};

export function selectLatestZeroHour(coords: ForecastCoordinates): SmokeSelection {
  if (coords.initTimes.length === 0) {
    throw new Error("No HRRR initialization times are available");
  }
  const leadTime = coords.leadTimes.findIndex((value) => value === 0);
  if (leadTime === -1) {
    throw new Error("No zero-hour HRRR lead time is available");
  }
  return {
    init_time: coords.initTimes.length - 1,
    lead_time: leadTime,
    y: null,
    x: null,
  };
}

export function buildSelection(selection: SmokeSelection): Record<string, number | zarr.Slice | null> {
  return selection;
}
