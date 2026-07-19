export const HRRR_SOURCE_NAME = "NOAA HRRR via TiTiler";
export const TITILER_BASE_URL = import.meta.env.VITE_TITILER_BASE_URL || "https://raster.eoapi.dev";

export const HRRR_CONUS_BBOX = [-134.12, 21.12, -60.9, 52.62] as const;

export type SmokeColorStep = readonly [readonly [number, number], readonly [number, number, number, number]];
export type SmokeColorStop = {
  min: number;
  max: number;
  color: readonly [number, number, number, number];
};
const DENSITY_STOPS = [
  { min: -Number.MAX_VALUE, max: 1, color: [255, 255, 255, 0] },
  { min: 1, max: 2, color: [177, 211, 225, 255] },
  { min: 2, max: 4, color: [137, 188, 211, 255] },
  { min: 4, max: 6, color: [94, 153, 193, 255] },
  { min: 6, max: 8, color: [66, 131, 165, 255] },
  { min: 8, max: 12, color: [72, 148, 102, 255] },
  { min: 12, max: 16, color: [102, 172, 61, 255] },
  { min: 16, max: 20, color: [183, 195, 79, 255] },
  { min: 20, max: 25, color: [223, 182, 72, 255] },
  { min: 25, max: 30, color: [221, 123, 49, 255] },
  { min: 30, max: 40, color: [213, 74, 40, 255] },
  { min: 40, max: 60, color: [192, 42, 33, 255] },
  { min: 60, max: 100, color: [171, 23, 30, 255] },
  { min: 100, max: 200, color: [140, 19, 24, 255] },
  { min: 200, max: Number.MAX_VALUE, color: [127, 31, 172, 255] },
] as const satisfies readonly SmokeColorStop[];

function stopsToColormap(stops: readonly SmokeColorStop[], scale = 1): SmokeColorStep[] {
  return stops.map((stop) => [[stop.min * scale, stop.max * scale], stop.color]);
}

export const SMOKE_LAYER = {
  variable: "MASSDEN",
  band: 76,
  sourceUnits: "kg/m³",
  displayUnits: "µg/m³",
  serverScale: 1_000_000_000,
  forecastHour: 0,
  opacity: 0.75,
} as const;

export const SMOKE_RENDERING = {
  label: "Surface (8 m) smoke mass density (µg/m³)",
  shortLabel: "Smoke density",
  units: "µg/m³",
  legendRange: [0, 200] as const,
  legendNote: "Color range is fixed; values above 200 µg/m³ use the top color.",
  colorStops: DENSITY_STOPS,
  colormap: stopsToColormap(DENSITY_STOPS, 1e-9),
} as const;
