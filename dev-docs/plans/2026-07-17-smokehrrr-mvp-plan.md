---
title: Smokehrrr MVP Plan
type: feat
status: active
date: 2026-07-17
origin: AGENTS.md
---

# Smokehrrr MVP Plan

## Summary

Build a static Vite frontend that proves the core data path: render the latest available zero-hour HRRR smoke slice from Dynamical's Icechunk/Zarr source in the browser with deck.gl-raster. Keep the first implementation narrow, with a map, a legend/status surface, and enough tests to protect date/selection and rendering-state logic.

---

## Problem Frame

The previous HRRR browser proved that a public smoke/weather map is useful, but it only shows current-day conditions and does not exercise direct browser rendering from the new Dynamical Icechunk source. The first risk is not product breadth; it is whether the app can reliably open the source data and draw the smoke field without a server.

---

## Requirements

- R1. The app renders a map centered on the continental United States.
- R2. The app attempts to open Dynamical's NOAA HRRR 48-hour forecast Icechunk/Zarr data directly from the browser.
- R3. The first visible data layer is smoke mass density for the latest available zero-hour lead time slice.
- R4. The UI clearly reports loading and data-access failure states.
- R5. The app includes a simple smoke legend or value-range explanation.
- R6. The implementation remains smoke-specific and does not add generic HRRR variable browsing.
- R7. If direct browser rendering is blocked, the blocker is documented before any server-side/titiler fallback work begins.

---

## Scope Boundaries

- No forecast timeline controls in the first implementation.
- No autoplay animation in the first implementation.
- No multiple HRRR variables.
- No user accounts, alerts, saved views, or backend product infrastructure.
- No server-side/titiler fallback unless the direct browser path is proven blocked.

### Deferred to Follow-Up Work

- Analysis history browser: add after the latest zero-hour slice renders.
- Forecast browser and disclaimer: add after the data path is stable.
- Automatic playback: add after multiple time slices are available in the UI.

---

## Context & Research

### Relevant Code and Patterns

- `AGENTS.md`: product vision, first milestone, and scope boundaries.
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/App.tsx` shows direct browser Zarr opening, latest forecast-run selection, `ZarrLayer`, colormap texture setup, and animation pattern.
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/ecmwf/metadata.ts` shows synthetic GeoZarr metadata and forecast dimension helpers for non-GeoZarr sources.
- Sibling `deck.gl-raster`: `examples/nldas-icechunk/src/nldas/store.ts` shows the Icechunk `HttpStorage`, `Repository`, `ReadSession`, and virtual chunk container pattern.
- Sibling `titiler-cmr-browser`: `src/style.css` and `src/main.ts` provide the map-first visual reference, loading affordances, and compact control-panel style.

### Institutional Learnings

- None found in this new repo.

### External References

- Dynamical catalog: `https://dynamical.org/catalog/noaa-hrrr-forecast-48-hour/`.
- Sibling `deck.gl-raster`: `docs/blog/initial-geozarr.md` documents the ZarrLayer release and Dynamical example.

---

## Key Technical Decisions

- Static frontend first: matches `AGENTS.md` and keeps the first milestone cheap to ship.
- Use React + Vite: follows the current deck.gl-raster Zarr examples and keeps UI state simple.
- Use deck.gl-raster's Zarr path before alternatives: the first milestone is a data-path proof, not a tile-service build.
- Keep source metadata isolated: HRRR dimension names, variable names, transform, and latest-slice selection should live in a small data module so a blocker or fallback is easy to reason about.
- Prefer tests around pure selection/status logic: WebGL rendering itself is better verified by a browser smoke check once the app exists.

---

## Open Questions

### Resolved During Planning

- Should a server fallback be allowed? Yes, but only after documenting why direct browser access is blocked.

### Deferred to Implementation

- Exact HRRR smoke variable path/name: inspect the opened Dynamical store and choose the smoke mass density variable during implementation.
- Exact synthetic GeoZarr metadata: derive from the HRRR array metadata during implementation.
- Latest available slice selection: determine whether the source exposes consolidated metadata or needs catalog/session inspection.
- CORS and virtual chunk container settings: verify in-browser against the live source before adding fallback infrastructure.

---

## Output Structure

    package.json
    index.html
    src/
      main.tsx
      App.tsx
      style.css
      hrrr/
        metadata.ts
        store.ts
        selection.ts
        get-tile-data.ts
        render-tile.ts
      ui/
        StatusPanel.tsx
        Legend.tsx
      *.test.ts

---

## Implementation Units

### U1. Scaffold the static map app

**Goal:** Create the minimal Vite/React application shell with MapLibre and deck.gl overlay wiring.

**Requirements:** R1, R4

**Dependencies:** None

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/style.css`
- Test: `src/app-state.test.ts`

**Approach:**
- Start from the shape of the deck.gl-raster Dynamical example, not from a custom rendering stack.
- Use a simple MapLibre basemap and initial CONUS view.
- Add loading/error state placeholders before data loading is wired in.

**Patterns to follow:**
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/App.tsx`
- Sibling `titiler-cmr-browser`: `src/style.css`

**Test scenarios:**
- Happy path: initial app state reports a loading source before HRRR data opens.
- Error path: an injected data-load failure produces a user-visible failure state instead of a blank map.

**Verification:**
- `npm run build` succeeds.
- `npm test` succeeds.
- Local dev server displays a CONUS map shell.

---

### U2. Open the HRRR Icechunk/Zarr source

**Goal:** Add a data module that opens the Dynamical HRRR store in the browser and exposes the smoke array plus metadata needed by the renderer.

**Requirements:** R2, R3, R4, R7

**Dependencies:** U1

**Files:**
- Create: `src/hrrr/store.ts`
- Create: `src/hrrr/metadata.ts`
- Test: `src/hrrr/store.test.ts`

**Approach:**
- Try the simplest public browser path first: direct Zarr fetch if the store layout supports it.
- If the source is Icechunk-specific, follow the `HttpStorage` / `ReadSession` pattern from the NLDAS Icechunk example.
- Validate dtype, dimensions, and missing-value metadata at the data boundary.
- If CORS, Icechunk version, virtual chunks, or missing metadata blocks the browser path, document the exact blocker in `dev-docs/direct-browser-blocker.md` before fallback work.

**Patterns to follow:**
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/App.tsx`
- Sibling `deck.gl-raster`: `examples/nldas-icechunk/src/nldas/store.ts`

**Test scenarios:**
- Happy path: a fake opened array with expected dtype and dimensions is accepted.
- Error path: unexpected dtype throws a clear data-boundary error.
- Error path: missing required smoke metadata returns a failure state that the UI can show.

**Verification:**
- Browser network panel shows requests to the Dynamical source, not a local backend.
- The app reports a clear error if the source cannot be opened.

---

### U3. Select the latest zero-hour smoke slice

**Goal:** Convert HRRR forecast dimensions into a stable selection for the latest available analysis / zero-hour lead time.

**Requirements:** R3, R6

**Dependencies:** U2

**Files:**
- Create: `src/hrrr/selection.ts`
- Test: `src/hrrr/selection.test.ts`

**Approach:**
- Keep this pure and testable: input is array shape/coordinate metadata, output is the non-spatial selection for `lead_time = 0` at the latest available initialization time.
- Do not add user controls yet; return one selected slice for the MVP.

**Patterns to follow:**
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/ecmwf/selection.ts`
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/ecmwf/metadata.ts`

**Test scenarios:**
- Happy path: given multiple init times and lead times including zero, selection chooses the final init time and zero-hour lead.
- Edge case: if zero-hour lead is not at index 0, selection still chooses the coordinate with value zero.
- Error path: if no zero-hour lead exists, selection returns a clear failure.

**Verification:**
- Tests pin latest-analysis selection without requiring live network access.

---

### U4. Render smoke tiles with deck.gl-raster

**Goal:** Wire `ZarrLayer` tile loading and smoke styling so the selected slice appears on the map.

**Requirements:** R1, R3, R5

**Dependencies:** U2, U3

**Files:**
- Create: `src/hrrr/get-tile-data.ts`
- Create: `src/hrrr/render-tile.ts`
- Create: `src/ui/Legend.tsx`
- Modify: `src/App.tsx`
- Test: `src/hrrr/render-tile.test.ts`

**Approach:**
- Follow the ECMWF example's `ZarrLayer`, `getTileData`, colormap texture, and `renderTile` split.
- Start with one conservative smoke colormap and fixed rescale range. Add controls later only if the default is unusable.
- Destroy tile textures on unload to avoid GPU memory leaks.

**Patterns to follow:**
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/ecmwf/get-tile-data.ts`
- Sibling `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/ecmwf/render-tile.ts`
- Sibling `deck.gl-raster`: `examples/nldas-icechunk/src/nldas/get-tile-data.ts`

**Test scenarios:**
- Happy path: renderer config maps smoke values through the selected rescale and colormap.
- Edge case: nodata/fill values are filtered transparent.
- Integration: changing only style inputs does not require rebuilding source selection state.

**Verification:**
- Local browser shows a smoke layer over the CONUS map for the latest zero-hour slice.
- Panning/zooming loads visible tiles without crashing.

---

### U5. Add MVP status, attribution, and docs

**Goal:** Make the prototype understandable to a first-time user and maintainable for the next agent.

**Requirements:** R4, R5, R7

**Dependencies:** U1, U2, U4

**Files:**
- Create: `README.md`
- Create: `src/ui/StatusPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/style.css`
- Create if needed: `dev-docs/direct-browser-blocker.md`
- Test: `src/ui/status.test.ts`

**Approach:**
- Show source, selected analysis time when known, loading state, and failure details.
- Document setup, scripts, data source, and the direct-browser/fallback rule.
- Keep copy factual; save forecast disclaimers for the forecast UI follow-up.

**Patterns to follow:**
- Sibling `titiler-cmr-browser`: `README.md`
- Sibling `titiler-cmr-browser`: `src/loading.ts`
- Sibling `titiler-cmr-browser`: `src/legend.ts`

**Test scenarios:**
- Happy path: status panel displays selected analysis time and source name when data is loaded.
- Error path: status panel displays the data-access blocker message when loading fails.
- Documentation check: README includes local development commands and data-source note.

**Verification:**
- `npm test` and `npm run build` pass.
- README is enough for a new agent to run the app locally.

---

## System-Wide Impact

- **Interaction graph:** `App.tsx` owns source loading, selection, map layer creation, and status surfaces until complexity justifies splitting further.
- **Error propagation:** data-boundary errors should become UI status errors and, if direct browser access is blocked, a short blocker document.
- **State lifecycle risks:** GPU textures must be destroyed on tile unload; source changes should invalidate stale tile caches.
- **API surface parity:** no public API yet; keep modules internal and boring.
- **Integration coverage:** live browser verification is required because unit tests cannot prove CORS, WebGL, or remote chunk access.
- **Unchanged invariants:** the MVP remains one smoke variable and one latest zero-hour slice.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Dynamical HRRR store is not directly readable from the browser | Document the blocker, then consider the allowed server/titiler fallback. |
| Source lacks GeoZarr metadata needed by `ZarrLayer` | Inject minimal synthetic metadata derived from the array, following existing deck.gl-raster examples. |
| HRRR chunks are too large or slow for smooth browsing | Keep the MVP to one slice and tune cache size/resolution before adding animation. |
| Published deck.gl-zarr package availability differs from workspace examples | Prefer released packages; if unavailable, document whether a workspace link or package release is required. |

---

## Documentation / Operational Notes

- Update `README.md` as part of the first implementation, not after.
- Keep `AGENTS.md` aligned if the direct-browser requirement changes.
- If a fallback is used, document why direct rendering failed and what would unblock returning to it.

---

## Sources & References

- Origin document: `AGENTS.md`
- Related sibling repo `deck.gl-raster`: `examples/dynamical-zarr-ecmwf/src/App.tsx`
- Related sibling repo `deck.gl-raster`: `examples/nldas-icechunk/src/nldas/store.ts`
- Related sibling repo `titiler-cmr-browser`: `src/style.css`
- External docs: [Dynamical NOAA HRRR 48-hour forecast catalog](https://dynamical.org/catalog/noaa-hrrr-forecast-48-hour/)
