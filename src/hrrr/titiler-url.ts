import { HRRR_CONUS_BBOX, SMOKE_LAYER, SMOKE_RENDERING } from "./metadata";

export type HrrrRun = {
  date: string;
  hour: number;
  forecastHour: number;
};

export type SmokeImageFormat = "png" | "tif" | "npy";

export type TitilerSmokeRequest = {
  titilerBaseUrl: string;
  run: HrrrRun;
  bbox: readonly [number, number, number, number];
  format?: SmokeImageFormat;
};

export type SmokeTileRequest = {
  titilerBaseUrl: string;
  run: HrrrRun;
  z: number;
  x: number;
  y: number;
};

export function buildHrrrGribUrl(run: HrrrRun): string {
  const hour = String(run.hour).padStart(2, "0");
  const forecastHour = String(run.forecastHour).padStart(2, "0");
  return `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.${run.date}/conus/hrrr.t${hour}z.wrfsfcf${forecastHour}.grib2`;
}

export function buildSmokeTitilerUrl({ titilerBaseUrl, run, bbox, format = "png" }: TitilerSmokeRequest): string {
  const base = titilerBaseUrl.replace(/\/$/, "");
  const gribUrl = buildHrrrGribUrl(run);
  const params = new URLSearchParams({
    url: `vrt://${gribUrl}?bands=${SMOKE_LAYER.band}`,
    dst_crs: "epsg:3857",
  });

  if (format === "png") {
    params.set("colormap", JSON.stringify(SMOKE_RENDERING.colormap));
  }

  return `${base}/external/bbox/${bbox.join(",")}.${format}?${params.toString()}`;
}

function smokeNpyParams(run: HrrrRun): URLSearchParams {
  return new URLSearchParams({
    url: `vrt://${buildHrrrGribUrl(run)}?bands=${SMOKE_LAYER.band}`,
    dst_crs: "epsg:3857",
    expression: `b1*${SMOKE_LAYER.serverScale}`,
    dtype: "uint16",
  });
}

export function buildSmokeNpyTileUrl({ titilerBaseUrl, run, z, x, y }: SmokeTileRequest): string {
  const base = titilerBaseUrl.replace(/\/$/, "");
  return `${base}/external/tiles/WebMercatorQuad/${z}/${x}/${y}.npy?${smokeNpyParams(run).toString()}`;
}

export function buildSmokeNpyBboxUrl({ titilerBaseUrl, run, bbox }: TitilerSmokeRequest): string {
  const base = titilerBaseUrl.replace(/\/$/, "");
  return `${base}/external/bbox/${bbox.join(",")}.npy?${smokeNpyParams(run).toString()}`;
}

export function buildLatestSmokeProbeUrl(titilerBaseUrl: string, run: HrrrRun): string {
  return buildSmokeTitilerUrl({ titilerBaseUrl, run, bbox: HRRR_CONUS_BBOX });
}
