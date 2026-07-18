# Spec: TiTiler HRRR Smoke Source

## Context

The direct browser Icechunk path is blocked because HRRR virtual chunks use the `gribberish` codec, which `zarrita` cannot decode in the browser today. That means the first useful Smokehrrr app should stop trying to decode GRIB-backed chunks client-side and should use the proven `noaa-hrrr-browser` pattern: TiTiler reads the public HRRR GRIB2 file and the static browser displays the rendered result.

This spec replaces only the data/rendering path. The product remains a smoke-focused map, not a generic HRRR browser.

## Goals

- Render the latest available zero-hour HRRR smoke slice on a CONUS map.
- Keep the frontend static: no Smokehrrr-owned backend for the first fallback.
- Use TiTiler to read NOAA HRRR GRIB2 via GDAL VRT URLs.
- Keep one smoke variable: surface / 8m smoke mass density.
- Make the image URL builder testable and isolated.
- Leave a clear path to request GeoTIFF if raw values are worth the added browser work.

## Non-goals

- Direct browser Icechunk decoding.
- Multiple HRRR variables.
- Forecast animation or broad timeline controls.
- User accounts, saved views, alerts, or server infrastructure.
- Client-side GeoTIFF decoding unless PNG rendering proves insufficient.

## Constraints and Assumptions

- NOAA public S3 HRRR GRIB2 objects remain reachable at:
  `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.YYYYMMDD/conus/hrrr.tHHz.wrfsfcf00.grib2`
- TiTiler endpoint supports `/external/bbox/{bbox}.{format}` with `url=vrt://...`, `bands`, `dst_crs`, and `colormap` parameters, as used by `noaa-hrrr-browser`.
- The smoke band for `MASSDEN` in `wrfsfcf00.grib2` is band `76`, matching `noaa-hrrr-browser`.
- MapLibre can display browser-native images (`png`, `jpeg`, `webp`) as an `image` source. It cannot directly display GeoTIFF without decoding code.
- Latest availability is discovered cheaply by probing candidate TiTiler URLs, not by listing S3.

## Architecture Overview

```text
Smokehrrr static frontend
  ├─ time selection: latest available analysis hour, FH0 only
  ├─ hrrr/titiler-url.ts: builds GRIB, VRT, and TiTiler URLs
  ├─ hrrr/availability.ts: probes recent hours until one returns 200
  ├─ MapLibre image source: displays returned PNG over CONUS bounds
  └─ status/legend UI: source, selected run, loading/error state

External services
  ├─ TiTiler: reads VRT-wrapped HRRR GRIB2 and renders bbox image
  └─ NOAA HRRR S3: public GRIB2 source files
```

Minimum viable rendering should use PNG. GeoTIFF is a follow-up variant because it adds a browser decoder and custom rendering path.

## API or Interface Design

```ts
export type HrrrRun = {
  date: string; // YYYYMMDD UTC
  hour: number; // 0-23 UTC
  forecastHour: 0;
};

export type SmokeImageFormat = "png" | "tif";

export type TitilerSmokeRequest = {
  titilerBaseUrl: string;
  run: HrrrRun;
  bbox: [number, number, number, number];
  format?: SmokeImageFormat;
};

export function buildHrrrGribUrl(run: HrrrRun): string;

export function buildSmokeTitilerUrl(request: TitilerSmokeRequest): string;

export async function findLatestSmokeRun(options: {
  titilerBaseUrl: string;
  now?: Date;
  maxLookbackHours?: number;
  signal?: AbortSignal;
}): Promise<HrrrRun>;
```

PNG URL shape:

```text
{TITILER_BASE_URL}/external/bbox/{minLon},{minLat},{maxLon},{maxLat}.png
  ?url={encodeURIComponent("vrt://{gribUrl}?bands=76")}
  &colormap={encodedSmokeColormap}
  &dst_crs=epsg:3857
```

GeoTIFF experiment URL shape:

```text
{TITILER_BASE_URL}/external/bbox/{minLon},{minLat},{maxLon},{maxLat}.tif
  ?url={encodeURIComponent("vrt://{gribUrl}?bands=76")}
  &dst_crs=epsg:3857
```

Do not include a colormap on the GeoTIFF request unless the desired artifact is a rendered RGB/RGBA TIFF. For client-side styling, request the single-band data and apply the smoke colormap in the browser.

## Data Model

```ts
export const HRRR_CONUS_BBOX = [-134.12, 21.12, -60.9, 52.62] as const;

export const SMOKE_LAYER = {
  variable: "MASSDEN",
  label: "Surface smoke mass density",
  band: 76,
  forecastHour: 0,
  units: "kg/m³",
  opacity: 0.75,
  colormap: [
    [[0, 1e-9], [255, 255, 255, 0]],
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
    [[200e-9, 1000e-9], [127, 31, 172, 255]],
  ],
} as const;
```

Map image coordinates follow the same bbox:

```ts
[
  [minLon, maxLat],
  [maxLon, maxLat],
  [maxLon, minLat],
  [minLon, minLat],
]
```

## Integration Points

- `src/App.tsx`: stop creating `ZarrLayer`; add/update a MapLibre `image` source when the selected TiTiler PNG URL changes.
- `src/hrrr/metadata.ts`: replace Icechunk metadata with TiTiler/GRIB constants.
- `src/hrrr/store.ts`, `get-tile-data.ts`, `render-tile.ts`: delete for the PNG fallback path.
- `src/hrrr/selection.ts`: replace Zarr dimension selection with latest-run discovery.
- `README.md`: document TiTiler dependency and keep the Icechunk blocker link.
- `dev-docs/direct-browser-blocker.md`: keep as the reason this fallback exists.

## Migration Path

1. Add pure URL-builder tests for GRIB URL, VRT URL, colormap encoding, and TiTiler bbox URL.
2. Add `findLatestSmokeRun` that probes the last 24-36 UTC hours with `HEAD`, falling back to `GET` if TiTiler rejects `HEAD`.
3. Replace `ZarrLayer` in `App.tsx` with a MapLibre image source/layer.
4. Delete now-unused Icechunk/deck.gl-zarr code and dependencies.
5. Update README to say the app uses TiTiler because browser Icechunk decoding is blocked by `gribberish`.
6. If PNG lacks needed value access or styling control, add a separate GeoTIFF experiment behind a small format switch.

## GeoTIFF Variant

Use GeoTIFF only when we need raw smoke values in the browser for value inspection, client-side color changes, or analysis-style interactions.

Additional requirements for GeoTIFF:

- Add a browser GeoTIFF decoder, likely `geotiff`, only after proving PNG is insufficient.
- Decode the TIFF into a typed array and georeference metadata.
- Render with deck.gl/deck.gl-raster or a minimal custom WebGL bitmap path.
- Keep PNG as the fallback because it is browser-native and simpler.

Skipped for MVP: direct MapLibre GeoTIFF display, because MapLibre image sources do not decode GeoTIFF.

## Testing Strategy

- Unit tests:
  - `buildHrrrGribUrl` formats date/hour/FH0 correctly.
  - `buildSmokeTitilerUrl` encodes `vrt://{gribUrl}?bands=76` exactly once.
  - `buildSmokeTitilerUrl` emits `.png` by default and `.tif` when requested.
  - `findLatestSmokeRun` chooses the first successful probe from newest to oldest using a fake fetch.
- Browser smoke check:
  - local app loads a CONUS map.
  - status panel shows selected UTC run.
  - smoke image appears or shows a clear TiTiler/availability error.
- Keep live-network tests out of Vitest by default.

## Decision Log

| Decision | Options Considered | Rationale |
| --- | --- | --- |
| Use TiTiler fallback now | Wait for browser `gribberish`; custom codec; TiTiler | TiTiler is already proven in `noaa-hrrr-browser`; custom browser codec is the expensive path. |
| Start with PNG | PNG; GeoTIFF | PNG works with native browser/MapLibre image rendering and avoids a decoder dependency. |
| Keep GeoTIFF as a variant | Ignore GeoTIFF; make it default | GeoTIFF may be useful for raw values, but defaulting to it adds complexity before the map works. |
| Probe latest hours | S3 listing; TiTiler probes; STAC catalog | Probes are the smallest static-frontend-compatible availability check. |
| Keep only `MASSDEN` | Generic layer selector; smoke-only | Smokehrrr should stay focused until the core smoke path works. |

## Open Questions

- Does the target TiTiler deployment return useful CORS headers for PNG and optional GeoTIFF requests?
- Does `HEAD` work on `/external/bbox/...`, or should availability probing use small `GET` requests with aborts/timeouts?
- Is band `76` stable across the exact HRRR files we will use, or should TiTiler metadata/info be checked per run?
- What TiTiler instance should be the public default for deployment?

## References

- `dev-docs/direct-browser-blocker.md`
- `dev-docs/plans/2026-07-17-smokehrrr-mvp-plan.md`
- `/home/henry/workspace/devseed/noaa-hrrr-browser/js/utils.js`
- `/home/henry/workspace/devseed/noaa-hrrr-browser/js/map.js`
- TiTiler pattern: `/external/bbox/{bbox}.png?url=vrt://...&dst_crs=epsg:3857`
