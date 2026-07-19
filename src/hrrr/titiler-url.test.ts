import { describe, expect, it } from "vitest";
import { HRRR_CONUS_BBOX, SMOKE_RENDERING } from "./metadata";
import { buildHrrrGribUrl, buildSmokeNpyBboxUrl, buildSmokeNpyTileUrl, buildSmokeTitilerUrl, type HrrrRun } from "./titiler-url";

const run: HrrrRun = { date: "20260717", hour: 3, forecastHour: 0 };

describe("buildHrrrGribUrl", () => {
  it.each([
    [0, "wrfsfcf00.grib2"],
    [1, "wrfsfcf01.grib2"],
    [18, "wrfsfcf18.grib2"],
  ])("formats forecast hour %i", (forecastHour, filename) => {
    expect(buildHrrrGribUrl({ ...run, forecastHour })).toBe(
      `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.20260717/conus/hrrr.t03z.${filename}`,
    );
  });
});

describe("buildSmokeTitilerUrl", () => {
  it("builds a PNG TiTiler bbox URL with one encoded VRT URL", () => {
    const url = new URL(buildSmokeTitilerUrl({ titilerBaseUrl: "https://titiler.example/", run, bbox: HRRR_CONUS_BBOX }));

    expect(url.pathname).toBe("/external/bbox/-134.12,21.12,-60.9,52.62.png");
    expect(url.searchParams.get("url")).toBe(`${"vrt://"}${buildHrrrGribUrl(run)}?bands=76`);
    expect(url.searchParams.get("dst_crs")).toBe("epsg:3857");
    expect(JSON.parse(url.searchParams.get("colormap") ?? "[]")).toEqual(SMOKE_RENDERING.colormap);
  });

  it("extends the smoke colormap ends so TiTiler snaps out-of-range values to nearest colors", () => {
    const colormap = JSON.parse(new URL(buildSmokeTitilerUrl({ titilerBaseUrl: "https://titiler.example/", run, bbox: HRRR_CONUS_BBOX })).searchParams.get("colormap") ?? "[]");

    expect(colormap[0][0][0]).toBeLessThan(-1e100);
    expect(colormap.at(-1)[0][1]).toBeGreaterThan(1e100);
  });

  it("builds a scaled single-band ndarray tile URL without a rendered colormap", () => {
    const url = new URL(buildSmokeNpyTileUrl({ titilerBaseUrl: "https://titiler.example/", run, z: 4, x: 5, y: 6 }));

    expect(url.pathname).toBe("/external/tiles/WebMercatorQuad/4/5/6.npy");
    expect(url.searchParams.get("url")).toBe(`${"vrt://"}${buildHrrrGribUrl(run)}?bands=76`);
    expect(url.searchParams.get("dst_crs")).toBe("epsg:3857");
    expect(url.searchParams.get("expression")).toBe("b1*1000000000");
    expect(url.searchParams.get("dtype")).toBe("uint16");
    expect(url.searchParams.has("colormap")).toBe(false);
  });

  it("builds a scaled single-band ndarray bbox URL without a rendered colormap", () => {
    const url = new URL(buildSmokeNpyBboxUrl({ titilerBaseUrl: "https://titiler.example/", run, bbox: HRRR_CONUS_BBOX }));

    expect(url.pathname).toBe("/external/bbox/-134.12,21.12,-60.9,52.62.npy");
    expect(url.searchParams.get("url")).toBe(`${"vrt://"}${buildHrrrGribUrl(run)}?bands=76`);
    expect(url.searchParams.get("dst_crs")).toBe("epsg:3857");
    expect(url.searchParams.get("expression")).toBe("b1*1000000000");
    expect(url.searchParams.get("dtype")).toBe("uint16");
    expect(url.searchParams.has("colormap")).toBe(false);
  });

  it("builds a single-band TIFF URL without a rendered colormap", () => {
    const url = new URL(buildSmokeTitilerUrl({ titilerBaseUrl: "https://titiler.example", run, bbox: HRRR_CONUS_BBOX, format: "tif" }));

    expect(url.pathname.endsWith(".tif")).toBe(true);
    expect(url.searchParams.has("colormap")).toBe(false);
  });
});
