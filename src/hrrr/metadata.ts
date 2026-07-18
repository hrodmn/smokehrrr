export const HRRR_SOURCE_NAME = "NOAA HRRR via TiTiler";
export const TITILER_BASE_URL = import.meta.env.VITE_TITILER_BASE_URL || "https://raster.eoapi.dev";

export const HRRR_CONUS_BBOX = [-134.12, 21.12, -60.9, 52.62] as const;

export const HRRR_CONUS_IMAGE_COORDINATES = [
  [HRRR_CONUS_BBOX[0], HRRR_CONUS_BBOX[3]],
  [HRRR_CONUS_BBOX[2], HRRR_CONUS_BBOX[3]],
  [HRRR_CONUS_BBOX[2], HRRR_CONUS_BBOX[1]],
  [HRRR_CONUS_BBOX[0], HRRR_CONUS_BBOX[1]],
] as const;

export type SmokeColorStep = readonly [readonly [number, number], readonly [number, number, number, number]];
export type SmokeRenderingId = "density" | "aqi";

const DENSITY_COLORMAP = [
  [[-Number.MAX_VALUE, 1e-9], [255, 255, 255, 0]],
  [[1e-9, 2e-9], [177, 211, 225, 255]],
  [[2e-9, 4e-9], [137, 188, 211, 255]],
  [[4e-9, 6e-9], [94, 153, 193, 255]],
  [[6e-9, 8e-9], [66, 131, 165, 255]],
  [[8e-9, 12e-9], [72, 148, 102, 255]],
  [[12e-9, 16e-9], [102, 172, 61, 255]],
  [[16e-9, 20e-9], [183, 195, 79, 255]],
  [[20e-9, 25e-9], [223, 182, 72, 255]],
  [[25e-9, 30e-9], [221, 123, 49, 255]],
  [[30e-9, 40e-9], [213, 74, 40, 255]],
  [[40e-9, 60e-9], [192, 42, 33, 255]],
  [[60e-9, 100e-9], [171, 23, 30, 255]],
  [[100e-9, 200e-9], [140, 19, 24, 255]],
  [[200e-9, Number.MAX_VALUE], [127, 31, 172, 255]],
] as const satisfies readonly SmokeColorStep[];

const AQI_COLORMAP = [
  [[-Number.MAX_VALUE, 9.1e-9], [0, 228, 0, 255]],
  [[9.1e-9, 35.5e-9], [255, 255, 0, 255]],
  [[35.5e-9, 55.5e-9], [255, 126, 0, 255]],
  [[55.5e-9, 125.5e-9], [255, 0, 0, 255]],
  [[125.5e-9, 225.5e-9], [143, 63, 151, 255]],
  [[225.5e-9, Number.MAX_VALUE], [126, 0, 35, 255]],
] as const satisfies readonly SmokeColorStep[];

export const SMOKE_LAYER = {
  variable: "MASSDEN",
  band: 76,
  forecastHour: 0,
  opacity: 0.75,
} as const;

export const SMOKE_RENDERINGS = {
  density: {
    id: "density",
    label: "Surface (8 m) smoke mass density (µg/m³)",
    shortLabel: "Smoke density",
    units: "µg/m³",
    legendRange: [0, 200] as const,
    legendNote: "Color range is fixed; values above 200 µg/m³ use the top color.",
    colormap: DENSITY_COLORMAP,
  },
  aqi: {
    id: "aqi",
    label: "AQI estimate from modeled near-surface smoke",
    shortLabel: "AQI estimate",
    units: "AQI",
    legendRange: [0, 301] as const,
    legendNote: "AQI colors are estimated from modeled smoke mass density, not official monitor AQI.",
    colormap: AQI_COLORMAP,
  },
} as const;
