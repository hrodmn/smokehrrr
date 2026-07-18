import { HRRR_CONUS_BBOX, SMOKE_LAYER, SMOKE_RENDERINGS, type SmokeRenderingId } from "./metadata";

export type HrrrRun = {
  date: string;
  hour: number;
  forecastHour: number;
};

export type SmokeImageFormat = "png" | "tif";

export type TitilerSmokeRequest = {
  titilerBaseUrl: string;
  run: HrrrRun;
  bbox: readonly [number, number, number, number];
  format?: SmokeImageFormat;
  rendering?: SmokeRenderingId;
};

export function buildHrrrGribUrl(run: HrrrRun): string {
  const hour = String(run.hour).padStart(2, "0");
  const forecastHour = String(run.forecastHour).padStart(2, "0");
  return `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.${run.date}/conus/hrrr.t${hour}z.wrfsfcf${forecastHour}.grib2`;
}

export function buildSmokeTitilerUrl({ titilerBaseUrl, run, bbox, format = "png", rendering = "density" }: TitilerSmokeRequest): string {
  const base = titilerBaseUrl.replace(/\/$/, "");
  const gribUrl = buildHrrrGribUrl(run);
  const params = new URLSearchParams({
    url: `vrt://${gribUrl}?bands=${SMOKE_LAYER.band}`,
    dst_crs: "epsg:3857",
  });

  if (format === "png") {
    params.set("colormap", JSON.stringify(SMOKE_RENDERINGS[rendering].colormap));
  }

  return `${base}/external/bbox/${bbox.join(",")}.${format}?${params.toString()}`;
}

export function buildLatestSmokeProbeUrl(titilerBaseUrl: string, run: HrrrRun): string {
  return buildSmokeTitilerUrl({ titilerBaseUrl, run, bbox: HRRR_CONUS_BBOX });
}
