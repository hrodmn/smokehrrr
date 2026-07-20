import { describe, expect, it } from "vitest";
import { buildSmokeFrames, eagerSmokeFrameOrder, formatUtcHour, formatViewerHour, formatViewerShortHour } from "./time";

const latestRun = { date: "20260717", hour: 3, forecastHour: 0 };

describe("formatViewerHour", () => {
  it("can show a viewer-local time zone label", () => {
    expect(formatViewerHour(new Date("2026-07-17T03:00:00Z"), { timeZone: "America/Denver" })).toContain("MDT");
  });

  it("formats compact timestamps for the timeline header", () => {
    expect(formatViewerShortHour(new Date("2026-07-17T03:00:00Z"))).not.toContain("2026");
  });
});

describe("buildSmokeFrames", () => {
  it("builds chronological analysis frames followed by forecasts", () => {
    const frames = buildSmokeFrames({ latestRun, analysisLookbackHours: 3, forecastHorizonHours: 2 });

    expect(frames.map((frame) => frame.id)).toEqual([
      "20260717T01Z-f000",
      "20260717T02Z-f000",
      "20260717T03Z-f000",
      "20260717T03Z-f001",
      "20260717T03Z-f002",
    ]);
    expect(frames.map((frame) => frame.kind)).toEqual(["analysis", "analysis", "analysis", "forecast", "forecast"]);
  });

  it("orders eager loading as forecasts first, then analyses newest to oldest", () => {
    const frames = buildSmokeFrames({ latestRun, analysisLookbackHours: 3, forecastHorizonHours: 2 });

    expect(eagerSmokeFrameOrder(frames).map((frame) => frame.id)).toEqual([
      "20260717T03Z-f001",
      "20260717T03Z-f002",
      "20260717T03Z-f000",
      "20260717T02Z-f000",
      "20260717T01Z-f000",
    ]);
  });

  it("includes the latest f00 frame once", () => {
    const frames = buildSmokeFrames({ latestRun, analysisLookbackHours: 1, forecastHorizonHours: 1 });

    expect(frames.filter((frame) => frame.id === "20260717T03Z-f000")).toHaveLength(1);
  });

  it("rolls analysis dates across UTC midnight", () => {
    const frames = buildSmokeFrames({ latestRun: { date: "20260717", hour: 1, forecastHour: 0 }, analysisLookbackHours: 3, forecastHorizonHours: 0 });

    expect(frames.map((frame) => frame.run)).toEqual([
      { date: "20260716", hour: 23, forecastHour: 0 },
      { date: "20260717", hour: 0, forecastHour: 0 },
      { date: "20260717", hour: 1, forecastHour: 0 },
    ]);
  });

  it("sets forecast valid times from run time plus forecast hour", () => {
    const frames = buildSmokeFrames({ latestRun, analysisLookbackHours: 1, forecastHorizonHours: 6, formatHour: formatUtcHour });
    const forecast = frames.at(-1);

    expect(forecast?.run).toEqual({ date: "20260717", hour: 3, forecastHour: 6 });
    expect(forecast?.validTime.toISOString()).toBe("2026-07-17T09:00:00.000Z");
    expect(forecast?.label).toBe("Forecast +6h · valid 2026-07-17 09Z");
  });

  it("labels analysis frames distinctly", () => {
    const [frame] = buildSmokeFrames({ latestRun, analysisLookbackHours: 1, forecastHorizonHours: 0, formatHour: formatUtcHour });

    expect(frame?.label).toBe("Analysis · 2026-07-17 03Z");
  });
});
