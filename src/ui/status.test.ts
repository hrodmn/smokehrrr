import { describe, expect, it } from "vitest";
import { statusText } from "./StatusPanel";

const analysisFrame = {
  id: "20260717T03Z-f000",
  kind: "analysis" as const,
  run: { date: "20260717", hour: 3, forecastHour: 0 },
  forecastHour: 0,
  validTime: new Date("2026-07-17T03:00:00Z"),
  label: "Analysis · 2026-07-17 03Z",
};
const forecastFrame = {
  ...analysisFrame,
  id: "20260717T03Z-f006",
  kind: "forecast" as const,
  run: { date: "20260717", hour: 3, forecastHour: 6 },
  forecastHour: 6,
  validTime: new Date("2026-07-17T09:00:00Z"),
  label: "Forecast +6h · valid 2026-07-17 09Z",
};

describe("statusText", () => {
  it("shows selected analysis state when loaded", () => {
    expect(statusText({ state: "ready", variable: "Surface (8 m) smoke mass density (µg/m³)", frame: analysisFrame })).toBe(
      "Surface (8 m) smoke mass density (µg/m³) · Analysis · 2026-07-17 03Z",
    );
  });

  it("shows selected forecast wording", () => {
    expect(statusText({ state: "ready", variable: "Surface (8 m) smoke mass density (µg/m³)", frame: forecastFrame })).toContain("Forecast +6h");
  });

  it("shows TiTiler availability errors", () => {
    expect(statusText({ state: "error", message: "No HRRR smoke run was available" })).toContain("No HRRR");
  });
});
