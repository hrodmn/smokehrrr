import { afterEach, describe, expect, it, vi } from "vitest";
import { cacheSmokeFrame, preloadSmokeFrames, type SmokeFrameCache, smokeFrameImageUrl } from "./image-cache";
import type { SmokeFrame } from "./time";

const frames: SmokeFrame[] = [0, 1, 2].map((forecastHour) => ({
  id: `f${forecastHour}`,
  kind: forecastHour === 0 ? "analysis" : "forecast",
  run: { date: "20260717", hour: 3, forecastHour },
  forecastHour,
  validTime: new Date("2026-07-17T03:00:00Z"),
  label: `f${forecastHour}`,
}));

afterEach(() => vi.unstubAllGlobals());

describe("smoke frame image cache", () => {
  it("builds the same TiTiler URL used by the map", () => {
    expect(smokeFrameImageUrl("https://titiler.example", frames[2])).toContain("wrfsfcf02.grib2");
  });

  it("warms the browser cache with GET", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(cacheSmokeFrame("https://titiler.example", frames[1])).resolves.toBe(true);

    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: "GET", cache: "default" });
  });

  it("preloads uncached nearby frames first", async () => {
    const order: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
        order.push(new URL(input.toString()).searchParams.get("url") ?? "");
        return new Response(null, { status: 200 });
      }),
    );
    const cache: SmokeFrameCache = new Map([["f1", "loaded"]]);
    const states: string[] = [];

    await preloadSmokeFrames({ titilerBaseUrl: "https://titiler.example", frames, currentIndex: 1, cache, onFrameState: (frameId, state) => states.push(`${frameId}:${state}`) });

    expect(order[0]).toContain("wrfsfcf00.grib2");
    expect(order[1]).toContain("wrfsfcf02.grib2");
    expect(cache.get("f0")).toBe("loaded");
    expect(states).toContain("f0:loading");
    expect(states).toContain("f2:loaded");
  });
});
