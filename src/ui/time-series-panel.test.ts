import { describe, expect, it } from "vitest";
import type { NdArrayTile } from "../hrrr/npy-tile";
import type { SmokeFrameArray } from "../hrrr/smoke-array-layer";
import type { SmokeFrame } from "../hrrr/time";
import { smokeTimeSeries } from "./TimeSeriesPanel";

function array(values: number[], width: number, height: number): SmokeFrameArray {
  const data = new Float32Array(values);
  const ndarray: NdArrayTile = {
    data,
    dtype: "f4",
    shape: [height, width],
    fortranOrder: false,
    width,
    height,
    bandCount: 1,
    byteLength: data.byteLength,
  };
  return { ndarray, byteLength: data.byteLength };
}

function frame(id: string): SmokeFrame {
  return {
    id,
    kind: "analysis",
    run: { date: "20260718", hour: 12, forecastHour: 0 },
    forecastHour: 0,
    validTime: new Date("2026-07-18T12:00:00Z"),
    label: id,
  };
}

describe("smokeTimeSeries", () => {
  it("returns sampled values and nulls for missing frames", () => {
    const frames = [frame("a"), frame("b")];

    expect(smokeTimeSeries(frames, { a: array([1, 2, 3, 4], 2, 2) }, { longitude: -60.9, latitude: 21.12 })).toEqual([
      { frame: frames[0], value: 4 },
      { frame: frames[1], value: null },
    ]);
  });
});
