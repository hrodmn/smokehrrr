export const HRRR_SOURCE_NAME = "Dynamical NOAA HRRR forecast, 48 hour virtual";
export const HRRR_REPO_URL =
  "https://dynamical-noaa-hrrr.s3.us-west-2.amazonaws.com/noaa-hrrr-forecast-48-hour-virtual/v0.5.0.icechunk";
export const HRRR_BRANCH = "main";
export const SMOKE_VARIABLE = "mass_density_8m";
export const HRRR_VIRTUAL_CHUNK_CONTAINERS = [
  {
    name: null,
    urlPrefix: "s3://noaa-hrrr-bdp-pds/",
    s3: { region: "us-east-1" },
  },
];

export const HRRR_GEOZARR_ATTRS = {
  "spatial:dimensions": ["y", "x"],
  "spatial:transform": [3000, 0, -2697520.142521929, 0, -3000, 1586693.847443335],
  "spatial:shape": [1059, 1799],
  "proj:code": "EPSG:3857",
} as const;

export const RESCALE_MIN = 0;
export const RESCALE_MAX = 1_000e-9;
