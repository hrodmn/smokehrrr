---
title: Time-Aware HRRR Smoke View
status: completed
created: 2026-07-17
origin: user request + dev-docs/specs/titiler-hrrr-smoke-source.md
---

# Time-Aware HRRR Smoke View Plan

## Problem frame

Smokehrrr now proves the TiTiler PNG path for the latest available zero-hour HRRR smoke slice. The next useful step is a time-aware view that lets users compare recent analyzed smoke conditions and inspect forecast smoke movement without turning the app into a generic HRRR browser.

The lazy version: one timeline, one smoke layer, one image source. Frames before/at now are recent `f00` analysis runs. Frames after now are forecast hours from the latest available run. No animation engine yet, no value inspection, no backend.

## Scope

### In scope

- Recent zero-hour analysis browsing for the last configurable lookback window.
- Forecast browsing from the latest available HRRR run.
- A compact time control that selects one frame at a time.
- Clear UI labeling for analysis vs forecast frames.
- Forecast disclaimer copy in the status/control panel.
- Testable frame construction, URL building, and availability behavior.

### Out of scope

- Multiple variables.
- Playback/animation controls.
- Server-side cataloging or caching.
- Client-side GeoTIFF decoding.
- Per-pixel value inspection.
- Broad HRRR run/variable explorer controls.

## Requirements trace

- R1. Users can move backward through recent zero-hour smoke analyses.
- R2. Users can move forward through smoke forecast frames from the latest available run.
- R3. The map displays exactly one selected frame as a TiTiler-rendered PNG.
- R4. Forecast frames are visibly labeled as forecasts, with run time and valid time.
- R5. Failed or unavailable frames produce a clear error and do not crash the app.
- R6. The app stays static and smoke-specific.

## Key technical decisions

| Decision | Rationale |
| --- | --- |
| Use one unified `SmokeFrame` model | Keeps UI and URL generation simple: every selected item has `run`, `forecastHour`, `validTime`, and `kind`. |
| Treat past frames as `forecastHour: 0` | Matches the current TiTiler path and avoids separate analysis data plumbing. |
| Use latest available run for forecast frames | Simple mental model and one source run for all future frames. |
| Probe availability lazily | Probing every analysis and forecast frame up front is slow and noisy. Build candidate frames cheaply, validate the selected frame, and mark failures in UI. |
| Start with a fixed forecast horizon constant | Avoids config UI. Default to a conservative horizon like 18 hours; raise toward 48 only if TiTiler latency and HRRR availability are acceptable. |
| Keep PNG rendering | Browser-native image source remains the shortest working path. |

## Proposed data model

Add a small time model under `src/hrrr/time.ts`:

- `SmokeFrameKind = "analysis" | "forecast"`
- `SmokeFrame`
  - `id: string`
  - `kind: SmokeFrameKind`
  - `run: HrrrRun`
  - `forecastHour: number`
  - `validTime: Date`
  - `label: string`
- `buildSmokeFrames(options)`
  - inputs: latest run, analysis lookback hours, forecast horizon hours
  - output: ordered frames from oldest analysis to latest forecast

Extend `HrrrRun` in `src/hrrr/titiler-url.ts` so `forecastHour` is `number`, not only `0`.

## Implementation units

### U1: Generalize HRRR URL building for forecast hours

**Goal:** Support `wrfsfcfXX.grib2` for any selected forecast hour while preserving the existing `f00` behavior.

**Files:**

- Modify: `src/hrrr/titiler-url.ts`
- Modify: `src/hrrr/titiler-url.test.ts`

**Approach:**

- Change `HrrrRun.forecastHour` from literal `0` to `number`.
- Keep hour/date formatting unchanged.
- Add tests for `f00`, `f01`, and a two-digit hour like `f18`.
- Keep `buildSmokeTitilerUrl` unchanged except for accepting generalized runs.

**Test scenarios:**

- `forecastHour: 0` still emits `wrfsfcf00.grib2`.
- `forecastHour: 1` emits `wrfsfcf01.grib2`.
- `forecastHour: 18` emits `wrfsfcf18.grib2`.
- PNG URL still includes the smoke colormap.
- TIFF URL still omits the colormap.

### U2: Add frame construction utilities

**Goal:** Build a deterministic list of selectable analysis and forecast frames from the latest available run.

**Files:**

- Create: `src/hrrr/time.ts`
- Create: `src/hrrr/time.test.ts`

**Approach:**

- Add constants such as `ANALYSIS_LOOKBACK_HOURS = 12` and `FORECAST_HORIZON_HOURS = 18` in `src/hrrr/metadata.ts` or `src/hrrr/time.ts`.
- Generate analysis frames by walking backward from the latest run at `forecastHour: 0`.
- Generate forecast frames by walking forward from the latest run at `forecastHour: 1..FORECAST_HORIZON_HOURS`.
- Compute `validTime = run time + forecastHour`.
- Use labels like `Analysis · 2026-07-17 03Z` and `Forecast +6h · valid 2026-07-17 09Z`.
- Keep IDs stable, for example `20260717T03Z-f006`.

**Test scenarios:**

- Builds frames in chronological order.
- Includes the latest `f00` frame once, not duplicated as both analysis and forecast.
- Correctly rolls dates across UTC midnight.
- Forecast valid times equal run time plus forecast hour.
- Labels distinguish analysis from forecast.

### U3: Update availability probing for selected frames

**Goal:** Keep startup fast while still handling missing HRRR files gracefully.

**Files:**

- Modify: `src/hrrr/availability.ts`
- Modify: `src/hrrr/availability.test.ts`

**Approach:**

- Keep `findLatestSmokeRun` focused on finding latest `f00`.
- Export a small `isSmokeFrameAvailable(titilerBaseUrl, frame, signal)` helper that probes the frame URL.
- Use the same `HEAD` then `GET` fallback as the current latest-run probe.
- Do not probe the whole timeline during startup.

**Test scenarios:**

- `findLatestSmokeRun` still finds latest `f00`.
- `isSmokeFrameAvailable` probes the selected frame's forecast-hour URL.
- `HEAD 405` falls back to `GET`.
- Abort errors are not swallowed by availability helpers.

### U4: Add a minimal time control UI

**Goal:** Let users select frames without adding animation or complex controls.

**Files:**

- Create: `src/ui/TimeControl.tsx`
- Create: `src/ui/time-control.test.tsx` or add pure formatter tests if component tests are not already set up
- Modify: `src/style.css`

**Approach:**

- Use native controls first: an `<input type="range">` over frame indexes plus previous/next buttons if needed.
- Show selected frame label and a small `Analysis` / `Forecast` badge.
- Disable controls while no frames exist.
- Do not add date pickers, run selectors, or animation controls in this pass.

**Test scenarios:**

- Label formatter returns clear analysis text.
- Label formatter returns clear forecast text with run and valid time.
- Range min/max match the frame count.
- Changing the range calls the selected-frame callback with the expected frame.

### U5: Wire selected frames into the map

**Goal:** Change the displayed PNG when the selected frame changes.

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/app-state.ts`
- Modify: `src/app-state.test.ts`
- Modify: `src/ui/StatusPanel.tsx`
- Modify: `src/ui/status.test.ts`

**Approach:**

- After `findLatestSmokeRun`, build frames and default to the latest analysis frame.
- Store `frames`, `selectedFrameIndex`, and selected-frame loading/error state in `App.tsx`.
- Build the TiTiler URL from the selected frame's run.
- On selection change, probe that frame. If available, update the image URL. If unavailable, show an error and leave the last successful image visible.
- Status panel should display selected frame label, run time, valid time, and forecast disclaimer when `kind === "forecast"`.

**Test scenarios:**

- Initial status reflects finding latest smoke run.
- Ready status for analysis shows analysis label and valid time.
- Ready status for forecast includes forecast wording.
- Error status shows unavailable-frame message.

### U6: Update docs

**Goal:** Document the time-aware TiTiler behavior and forecast caveat.

**Files:**

- Modify: `README.md`

**Approach:**

- Describe recent analysis browsing and forecast browsing.
- Keep the TiTiler dependency and Icechunk blocker explanation.
- Mention `VITE_TITILER_BASE_URL`.
- Add a short forecast caveat: forecast frames are model guidance, not observed smoke.

**Test scenarios:**

- Documentation-only; verify README matches the implemented controls and data path.

## Sequencing

1. U1 URL generalization.
2. U2 frame construction.
3. U3 selected-frame availability helper.
4. U4 time control UI.
5. U5 app integration.
6. U6 README update.

U1-U3 are the core data path and should land before UI wiring. U4 can be built against fake frames, then wired in U5.

## Verification

- `npm test`
- `npm run build`
- Manual browser check:
  - App loads latest analysis.
  - Moving backward changes to older `f00` frames.
  - Moving forward selects forecast frames.
  - Forecast frame status shows run and valid time.
  - Unavailable frame shows a clear error without blanking the map.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| TiTiler requests are slow for full-CONUS forecast frames | Probe selected frame only; keep last successful image visible; defer preloading. |
| Some forecast hours are unavailable for a run | Selected-frame availability check reports a clear error. |
| Forecast horizon differs by HRRR cycle | Start with conservative `FORECAST_HORIZON_HOURS`; tune after manual checks. |
| Timeline becomes confusing around latest analysis vs forecast | Use explicit `Analysis` and `Forecast` labels plus valid time. |
| UI scope creeps into animation | Defer playback until single-frame browsing works. |

## Deferred questions for implementation

- What forecast horizon feels fast enough against the chosen TiTiler deployment: 18, 24, or 48 hours?
- Should failed forecast frames be skipped from the slider after first failure, or remain selectable with error state?
- Should the timeline default to latest analysis or first forecast when the latest analysis is already several hours old?
