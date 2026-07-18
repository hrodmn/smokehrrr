import { describe, expect, it } from "vitest";
import type { SmokeFrame } from "../hrrr/time";
import { frameBadge, frameIndexes, frameLoadSummary, latestAnalysisFrameIndex, timeControlRange, timelineMarks } from "./TimeControl";

const analysisFrame: SmokeFrame = {
  id: "20260717T03Z-f000",
  kind: "analysis",
  run: { date: "20260717", hour: 3, forecastHour: 0 },
  forecastHour: 0,
  validTime: new Date("2026-07-17T03:00:00Z"),
  label: "Analysis · 2026-07-17 03Z",
};
const forecastFrame: SmokeFrame = {
  ...analysisFrame,
  id: "20260717T03Z-f006",
  kind: "forecast",
  run: { date: "20260717", hour: 3, forecastHour: 6 },
  forecastHour: 6,
  validTime: new Date("2026-07-17T09:00:00Z"),
  label: "Forecast +6h · valid 2026-07-17 09Z",
};

describe("time control helpers", () => {
  it("labels analysis and forecast frames clearly", () => {
    expect(frameBadge(analysisFrame)).toBe("Analysis");
    expect(frameBadge(forecastFrame)).toBe("Forecast");
  });

  it("uses frame indexes as range bounds", () => {
    expect(timeControlRange([analysisFrame, forecastFrame])).toEqual({ min: 0, max: 1, disabled: false });
  });

  it("disables range controls when no frames exist", () => {
    expect(timeControlRange([])).toEqual({ min: 0, max: 0, disabled: true });
  });

  it("finds the latest analysis frame for current conditions", () => {
    expect(latestAnalysisFrameIndex([analysisFrame, forecastFrame])).toBe(0);
    expect(latestAnalysisFrameIndex([forecastFrame])).toBe(-1);
  });

  it("finds animation ranges by frame kind", () => {
    expect(frameIndexes([analysisFrame, forecastFrame], "analysis")).toEqual([0]);
    expect(frameIndexes([analysisFrame, forecastFrame], "forecast")).toEqual([1]);
  });

  it("marks the start, current conditions, and end of the timeline", () => {
    expect(timelineMarks([analysisFrame, forecastFrame])).toEqual([
      { index: 0, label: "2026-07-17 03Z" },
      { index: 1, label: "Forecast +6h 2026-07-17 09Z" },
    ]);
  });

  it("summarizes frame loading progress", () => {
    expect(frameLoadSummary([analysisFrame, forecastFrame], { [analysisFrame.id]: "loaded", [forecastFrame.id]: "loading" })).toBe("1/2 loaded · 1 loading");
  });
});
