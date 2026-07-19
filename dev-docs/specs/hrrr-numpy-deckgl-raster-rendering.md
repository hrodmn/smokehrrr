# Spec: HRRR NumPy Tiles with deck.gl-raster Rendering

## Context

Smokehrrr currently asks TiTiler for pre-rendered PNG overlays. That proved the HRRR smoke data path, but it puts styling on the server side. Every rendering switch changes the PNG URL, re-fetches rendered imagery, and limits client-side interactions such as AQI/density toggles, value inspection, and future palette changes.

The sibling `titiler-cmr-browser` already has the right pattern for this problem: request `.npy` tiles from TiTiler, decode the NumPy arrays in the browser with `npyjs`, upload tile bands as `r32float` textures, and render them with `@developmentseed/deck.gl-raster` GPU modules. Smokehrrr should adapt that pattern, not invent a renderer.

One important difference: HRRR `MASSDEN` values are tiny in native units (`kg/m³`, commonly `1e-9` to `2e-7`). The TiTiler request must rescale the raw band to `µg/m³` on the server with an expression such as `rescale=b1*1000000000` before the browser receives the ndarray. This keeps shader thresholds in human-scale values and avoids precision-sensitive GPU comparisons around `1e-9`.

## Goals

- Replace MapLibre image-source PNG smoke overlays with deck.gl-raster tile rendering.
- Request raw single-band NumPy tiles from TiTiler instead of server-colored PNGs.
- Ask TiTiler for `MASSDEN` already scaled to `µg/m³`.
- Render both smoke density and AQI estimate from the same cached tile data.
- Keep Smokehrrr smoke-specific: one variable, one raw band, two render modes.
- Reuse the minimal proven pieces from `titiler-cmr-browser`.

## Non-goals

- Restoring direct browser Icechunk/Zarr decoding.
- A generic raster style expression editor.
- Multi-variable HRRR browsing.
- Server-rendered PNG fallback in the primary path, except as an emergency failure fallback.
- Full official AQI or NowCast calculation.

## Constraints and Assumptions

- TiTiler endpoint supports WebMercator tile ndarray responses shaped as `.npy`:
  - `/external/tiles/WebMercatorQuad/{z}/{x}/{y}.npy?...`
  - or equivalent endpoint on the selected deployment.
- TiTiler can apply a per-band expression/rescale before encoding the NumPy tile. Required transform:
  - `MASSDEN_µg_m3 = b1 * 1_000_000_000`
- Browser receives values in `µg/m³`, not `kg/m³`.
- Tile data is single-band scalar data, usually `Float32Array` after decode/upload.
- deck.gl-raster and luma dependencies are acceptable because the app already identified PNG styling as insufficient.
- The existing timeline, availability probing, and frame model should remain intact.

## Architecture Overview

```text
React App
  ├─ MapLibre basemap + labels
  ├─ DeckGlOverlay
  │   └─ RasterTileLayer per selected smoke frame
  │       ├─ getTileData(tile): fetch .npy from TiTiler
  │       ├─ decodeNpyTile(buffer): ndarray metadata + typed array
  │       ├─ createBandTextures(tile): r32float texture for MASSDEN µg/m³
  │       └─ renderTile(tile): GPU module pipeline
  │           ├─ density mode: piecewise smoke colormap
  │           └─ AQI mode: piecewise AQI color bands
  ├─ Rendering toggle: changes render pipeline only
  └─ Time controls: changes tile URL source/frame

External
  ├─ TiTiler reads HRRR GRIB2 through VRT band 76
  └─ NOAA HRRR S3 GRIB2 objects
```

The lazy migration is not to port the whole generic `titiler-cmr-browser` state system. Copy/adapt only the boring pieces Smokehrrr needs:

- ndarray decode and shape validation
- WebMercatorQuad descriptor loading
- RasterTileLayer creation
- one custom shader module for smoke rendering
- tile resource cleanup

## API or Interface Design

### Render mode metadata

```ts
export type SmokeRenderingId = "density" | "aqi";

export type SmokeRenderMode = {
  id: SmokeRenderingId;
  label: string;
  shortLabel: string;
  units: string;
  legendRange: readonly [number, number];
  legendNote: string;
  colorStops: readonly SmokeColorStop[];
};

export type SmokeColorStop = {
  min: number; // µg/m³, inclusive
  max: number; // µg/m³, exclusive except final stop
  color: readonly [number, number, number, number]; // 0-255 RGBA
};
```

Current density stops should be converted from kg/m³ to µg/m³ once in metadata:

```ts
// Old PNG thresholds: 1e-9 kg/m³, 2e-9 kg/m³, ...
// New GPU thresholds: 1 µg/m³, 2 µg/m³, ...
```

AQI estimate stops use PM2.5 concentration breakpoints in `µg/m³`:

```ts
const AQI_STOPS = [
  { min: -Infinity, max: 9.1, color: [0, 228, 0, 255] },
  { min: 9.1, max: 35.5, color: [255, 255, 0, 255] },
  { min: 35.5, max: 55.5, color: [255, 126, 0, 255] },
  { min: 55.5, max: 125.5, color: [255, 0, 0, 255] },
  { min: 125.5, max: 225.5, color: [143, 63, 151, 255] },
  { min: 225.5, max: Infinity, color: [126, 0, 35, 255] },
] as const;
```

### Tile URL builder

```ts
export type SmokeTileRequest = {
  titilerBaseUrl: string;
  run: HrrrRun;
  z: number;
  x: number;
  y: number;
};

export function buildSmokeNpyTileUrl(request: SmokeTileRequest): string;
```

URL shape for the current `raster.eoapi.dev` deployment:

```text
{TITILER_BASE_URL}/external/tiles/WebMercatorQuad/{z}/{x}/{y}.npy
  ?url=vrt://{HRRR_GRIB_URL}?bands=76
  &dst_crs=epsg:3857
  &expression=b1*1000000000
```

Do not pass `colormap` for `.npy` requests. All color happens client-side.

### Decoded tile data

Adapt from `titiler-cmr-browser/src/tile-data.ts`:

```ts
export type SupportedTileArray = Uint8Array | Int16Array | Uint16Array | Float32Array | Float64Array;

export type NdArrayTile = {
  data: SupportedTileArray;
  dtype: string;
  shape: number[];
  fortranOrder: boolean;
  width: number;
  height: number;
  bandCount: number;
  byteLength: number;
};

export type SmokeGpuTileData = {
  ndarray: NdArrayTile;
  width: number;
  height: number;
  byteLength: number;
  smokeTexture: Texture; // r32float, values already µg/m³
};
```

Smokehrrr only needs one data band. Reject unexpected shapes rather than supporting generic band assembly:

- accept `[height, width]`
- accept `[1, height, width]`
- optionally accept `[2, height, width]` only if TiTiler returns data + alpha; use band 2 as mask

### Deck layer factory

```ts
export function createSmokeDeckLayer(options: {
  frame: SmokeFrame;
  rendering: SmokeRenderingId;
  descriptor: TileMatrixSetAdaptor;
  titilerBaseUrl: string;
}): Layer;
```

Layer behavior:

- `id` includes frame id, but not render mode if tile data can be reused across modes.
- `getTileData` fetches and decodes `.npy` tiles.
- `renderTile` chooses density or AQI GPU pipeline from `rendering`.
- `updateTriggers.renderTile = [rendering]` so toggles restyle without re-fetching tiles.
- `onTileUnload` destroys the luma texture.

## Data Model

### Raw value units

From this migration forward, browser tile values are `µg/m³`.

```ts
export const SMOKE_LAYER = {
  variable: "MASSDEN",
  band: 76,
  sourceUnits: "kg/m³",
  displayUnits: "µg/m³",
  serverScale: 1_000_000_000,
  opacity: 0.75,
} as const;
```

The scaling belongs in the TiTiler request, not the shader. That avoids comparing/normalizing tiny native-unit floats in GPU code and keeps legends/test fixtures readable.

### Cache keys

```ts
export function getSmokeTileCacheKey(frame: SmokeFrame, z: number, x: number, y: number): string {
  return `${frame.id}/${z}/${x}/${y}`;
}
```

Render mode is intentionally absent from the cache key. Density and AQI modes share the same scaled data.

## GPU Rendering Design

### Option A: custom piecewise color module, recommended

Use one small shader module that samples the scalar smoke texture and applies color stops directly. This avoids contorting stepped AQI colors into the continuous deck.gl colormap sprite.

Pseudo-GLSL:

```glsl
uniform sampler2D smokeTexture;
uniform int renderMode;

vec4 densityColor(float value) {
  if (!(value > 0.0) || isnan(value) || isinf(value)) return vec4(0.0);
  if (value < 1.0) return vec4(0.0);
  if (value < 2.0) return rgba(177, 211, 225, 255);
  // ...
  if (value < 200.0) return rgba(140, 19, 24, 255);
  return rgba(127, 31, 172, 255);
}

vec4 aqiColor(float value) {
  if (!(value > 0.0) || isnan(value) || isinf(value)) return vec4(0.0);
  if (value < 9.1) return rgba(0, 228, 0, 255);
  if (value < 35.5) return rgba(255, 255, 0, 255);
  if (value < 55.5) return rgba(255, 126, 0, 255);
  if (value < 125.5) return rgba(255, 0, 0, 255);
  if (value < 225.5) return rgba(143, 63, 151, 255);
  return rgba(126, 0, 35, 255);
}
```

The module can be generated from TypeScript stops to avoid duplicating thresholds by hand. Keep generation tiny: no generic expression compiler unless another variable needs it.

### Option B: existing deck.gl-raster `LinearRescale` + `Colormap`

Good for continuous density palettes, bad for discrete AQI thresholds. It would require a custom LUT with sharp repeated stops or separate AQI logic anyway. Use only if density rendering ships first and AQI follows later.

### CPU fallback

A CPU fallback can produce `ImageData` from the same stops for tests and browsers where GPU module creation fails. It should be one small helper:

```ts
export function renderSmokeTileCpu(tile: SmokeGpuTileData, rendering: SmokeRenderingId): ImageData;
```

Do not build a full parallel renderer unless a real browser failure appears.

## Integration Points

- `package.json`
  - Add `@deck.gl/core`, `@deck.gl/mapbox`, `@developmentseed/deck.gl-raster`, `@developmentseed/morecantile`, `@luma.gl/core`, `@luma.gl/shadertools`, `npyjs`.
  - Do not add `@developmentseed/deck.gl-zarr`, `icechunk-js`, or `zarrita`.
- `src/App.tsx`
  - Replace MapLibre `image` source/layer with `DeckGlOverlay` and `RasterTileLayer`.
  - Keep MapLibre basemap and labels.
  - Keep rendering toggle state.
- `src/hrrr/titiler-url.ts`
  - Add `.npy` tile URL builder.
  - Keep PNG URL builder only if we want a temporary fallback.
- `src/hrrr/image-cache.ts`
  - Replace frame-image preloading with tile cache or delete it.
- `src/hrrr/metadata.ts`
  - Store render stops in `µg/m³`.
- `src/ui/Legend.tsx`
  - Read render stops from the same metadata used by GPU code.
- New files, minimal set:
  - `src/hrrr/npy-tile.ts`
  - `src/hrrr/smoke-deck-layer.ts`
  - `src/hrrr/smoke-gpu-render.ts`

## Migration Path

1. Add dependencies used by the sibling deck.gl-raster path.
2. Add `buildSmokeNpyTileUrl` with the server-side `µg/m³` scale parameter and tests that assert no `colormap` param is present.
3. Port the smallest `decodeNpyTile`/shape helper from `titiler-cmr-browser/src/tile-data.ts`.
4. Add a `RasterTileLayer` factory that fetches one scaled `MASSDEN` tile and uploads it as `r32float`.
5. Add GPU piecewise color module for density rendering only.
6. Switch `App.tsx` from image source to deck overlay.
7. Wire the AQI toggle to change only `renderTile`/shader props, not tile URL.
8. Delete old PNG frame cache if no fallback remains.
9. Keep current availability probing by frame-level PNG/probe only until a cheaper `.npy` tile probe is proven. Do not block rendering migration on perfect availability discovery.

## Testing Strategy

Unit tests:

- `buildSmokeNpyTileUrl`
  - builds `/external/tiles/WebMercatorQuad/{z}/{x}/{y}.npy`
  - includes VRT HRRR band 76 source
  - includes server-side `b1*1000000000` scaling
  - omits `colormap`
- `decodeNpyTile`
  - accepts `[height,width]` scalar tiles
  - accepts `[1,height,width]` tiles
  - rejects unsupported shapes and Fortran order
- GPU module generation
  - emitted shader contains density thresholds in `µg/m³`, not `e-9`
  - emitted shader contains AQI thresholds `9.1`, `35.5`, `55.5`, `125.5`, `225.5`
  - render mode is in `updateTriggers.renderTile`
- CPU fallback or color helper
  - maps representative values to expected density/AQI RGBA colors

Manual browser check:

- Load current frame.
- Pan/zoom and verify tiles load progressively.
- Toggle Density/AQI and confirm network panel does not re-fetch raw tiles solely because style changed.
- Confirm legends match visible colors.

## Decision Log

| Decision | Options Considered | Rationale |
| --- | --- | --- |
| Request `.npy` tiles | PNG overlays, GeoTIFF bbox, `.npy` tiles | `.npy` matches `titiler-cmr-browser`, is easy to decode with `npyjs`, and fits deck.gl-raster tile rendering. |
| Scale to `µg/m³` in TiTiler | Shader multiplies `kg/m³`; CPU scales after decode; TiTiler expression | Server scaling avoids tiny GPU thresholds and keeps one unit model in the browser. |
| Custom piecewise shader | deck.gl colormap sprite; CPU-rendered ImageData; custom shader | AQI is discrete threshold coloring, so direct shader branches are simpler and exact. |
| Cache by frame/tile only | Include render mode in cache; cache rendered images | Data is shared by density and AQI. Style changes should not re-fetch data. |
| Port minimal sibling code | Copy whole generic browser; write from scratch | Minimal port preserves proven patterns without importing generic catalog complexity. |

## Open Questions

- Should frame availability probing move to a small `.npy` tile request once the tile path works?

Resolved during implementation:

- `raster.eoapi.dev` uses `expression=b1*1000000000` for `/external/tiles/...npy`; `rescale=b1*1000000000` returns `500` because `rescale` expects numeric bounds.
- The selected TiTiler deployment exposes `/external/tiles/WebMercatorQuad/...npy` for VRT-wrapped external GRIB sources with CORS enabled.
- Does TiTiler return an alpha/mask band for this endpoint, or only the scalar data band?

## References

- `../../devseed/titiler-cmr-browser/src/tile-data.ts`
- `../../devseed/titiler-cmr-browser/src/titiler-cmr.ts`
- `../../devseed/titiler-cmr-browser/src/deck-layers.ts`
- `../../devseed/titiler-cmr-browser/src/gpu-render.ts`
- `dev-docs/specs/titiler-hrrr-smoke-source.md`
- `dev-docs/direct-browser-blocker.md`
