import { describe, expect, it } from "vitest";
import { initialStatus, type AppStatus } from "./app-state";
import { statusText } from "./ui/StatusPanel";

const frame = {
  id: "20260717T03Z-f000",
  kind: "analysis" as const,
  run: { date: "20260717", hour: 3, forecastHour: 0 },
  forecastHour: 0,
  validTime: new Date("2026-07-17T03:00:00Z"),
  label: "Analysis · 2026-07-17 03Z",
};

describe("app state", () => {
  it("starts by looking for the latest HRRR smoke run", () => {
    expect(initialStatus()).toEqual({ state: "loading", message: "Finding latest HRRR smoke run…" });
  });

  it("turns data failures into user-visible status text", () => {
    const status: AppStatus = { state: "error", message: "No HRRR smoke run was available" };
    expect(statusText(status)).toBe("No HRRR smoke run was available");
  });

  it("shows the selected frame in ready status text", () => {
    expect(statusText({ state: "ready", variable: "Surface (8 m) smoke mass density (µg/m³)", frame })).toBe(
      "Surface (8 m) smoke mass density (µg/m³) · Analysis · 2026-07-17 03Z",
    );
  });
});
