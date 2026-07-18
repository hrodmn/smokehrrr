import { afterEach, describe, expect, it, vi } from "vitest";
import { findLatestSmokeRun, isSmokeFrameAvailable } from "./availability";
import type { SmokeFrame } from "./time";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("findLatestSmokeRun", () => {
  it("chooses the first successful run from newest to oldest", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      findLatestSmokeRun({ titilerBaseUrl: "https://titiler.example", now: new Date("2026-07-17T03:40:00Z"), maxLookbackHours: 3 }),
    ).resolves.toEqual({ date: "20260717", hour: 2, forecastHour: 0 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(new URL(fetch.mock.calls[0]?.[0]?.toString() ?? "").searchParams.get("url")).toContain(
      "hrrr.20260717/conus/hrrr.t03z.wrfsfcf00.grib2",
    );
    expect(new URL(fetch.mock.calls[1]?.[0]?.toString() ?? "").searchParams.get("url")).toContain(
      "hrrr.20260717/conus/hrrr.t02z.wrfsfcf00.grib2",
    );
  });

  it("falls back to GET when HEAD is not allowed", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      findLatestSmokeRun({ titilerBaseUrl: "https://titiler.example", now: new Date("2026-07-17T03:00:00Z"), maxLookbackHours: 1 }),
    ).resolves.toEqual({ date: "20260717", hour: 3, forecastHour: 0 });

    expect(fetch.mock.calls.map((call) => (call[1] as RequestInit).method)).toEqual(["HEAD", "GET"]);
  });
});

describe("isSmokeFrameAvailable", () => {
  const frame: SmokeFrame = {
    id: "20260717T03Z-f006",
    kind: "forecast",
    run: { date: "20260717", hour: 3, forecastHour: 6 },
    forecastHour: 6,
    validTime: new Date("2026-07-17T09:00:00Z"),
    label: "Forecast +6h · valid 2026-07-17 09Z",
  };

  it("probes the selected frame forecast-hour URL", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(isSmokeFrameAvailable("https://titiler.example", frame)).resolves.toBe(true);

    expect(new URL(fetch.mock.calls[0]?.[0]?.toString() ?? "").searchParams.get("url")).toContain(
      "hrrr.20260717/conus/hrrr.t03z.wrfsfcf06.grib2",
    );
  });

  it("falls back to GET when HEAD is not allowed", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(isSmokeFrameAvailable("https://titiler.example", frame)).resolves.toBe(true);

    expect(fetch.mock.calls.map((call) => (call[1] as RequestInit).method)).toEqual(["HEAD", "GET"]);
  });

  it("does not swallow abort errors", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockRejectedValueOnce(abort));

    await expect(isSmokeFrameAvailable("https://titiler.example", frame)).rejects.toBe(abort);
  });
});
