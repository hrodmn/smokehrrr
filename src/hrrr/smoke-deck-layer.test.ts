import { describe, expect, it } from "vitest";
import { createSmokeDeckLayer, getSmokeTileCacheKey } from "./smoke-deck-layer";
import type { SmokeFrame } from "./time";

const frame: SmokeFrame = {
  id: "20260717T03Z-f000",
  kind: "analysis",
  run: { date: "20260717", hour: 3, forecastHour: 0 },
  forecastHour: 0,
  validTime: new Date("2026-07-17T03:00:00Z"),
  label: "Analysis · 2026-07-17 03Z",
};

describe("createSmokeDeckLayer", () => {
  it("builds a smoke tile layer without putting style in the tile cache key", () => {
    const layer = createSmokeDeckLayer({ frame, descriptor: {} as never, titilerBaseUrl: "https://titiler.example" });

    expect(layer.props.updateTriggers?.renderTile).toBeUndefined();
    expect(layer.id).toBe(`hrrr-smoke-${frame.id}`);
    expect(getSmokeTileCacheKey(frame, 1, 2, 3)).toBe(`${frame.id}/1/2/3`);
  });
});
