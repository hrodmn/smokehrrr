# AGENTS.md

## Project vision

Smokehrrr is a smoke-focused HRRR browser for people who want to understand how wildfire smoke is playing out across the United States. It should make recent analyzed conditions and forecast smoke movement easy to inspect on a map without turning into a general-purpose HRRR data explorer.

The app should feel visually aligned with `titiler-cmr-browser`: a polished, map-first static web application with clear controls, readable legends, and minimal clutter.

## First milestone

Build the smallest useful proof:

- Render the latest available zero-hour HRRR smoke slice on a map.
- Read from Dynamical's NOAA HRRR 48-hour forecast Icechunk/Zarr data source.
- Use deck.gl-raster for direct in-browser visualization if practical.
- Keep the first pass focused on one variable and one latest frame.

This milestone proves the data path before investing in timeline controls, animation, or polish.

## Product direction

After the first milestone works, expand toward:

- Recent analysis browsing so users can see how smoke conditions changed over the last several hours.
- Forecast browsing for smoke mass density, with a clear forecast disclaimer.
- Automatic playback/animation when possible, not only a manual slider.
- A focused public viewer for smoke, not a technical research console.

## Scope boundaries

Do not add these until the core smoke viewer works:

- Multiple HRRR variables.
- User accounts, alerts, saved views, or backend product infrastructure.
- Complex animation controls.
- Broad data catalog browsing.

A server-side/titiler fallback is allowed if direct browser Icechunk rendering blocks progress. Prefer documenting the blocker before adding infrastructure.

## Reference projects

Use these sibling projects for context when available:

- `../noaa-hrrr-browser`: earlier HRRR browser and current-day conditions reference.
- `../titiler-cmr-browser`: visual and interaction style reference.
- `../deck.gl-raster`: rendering library and Icechunk/Zarr examples.

## Development principles

- Start static frontend-first unless data access proves otherwise.
- Prove data access before polishing UI.
- Reuse existing deck.gl-raster examples and patterns instead of inventing a new rendering stack.
- Match the smoke colormap used in `noaa-hrrr-browser` for `MASSDEN` unless there is a deliberate user-facing reason to change it.
- Keep the app smoke-specific. If a feature serves generic HRRR browsing more than smoke interpretation, defer it.
- Add only the controls needed for the current milestone.
- Document forecast uncertainty and data-source assumptions in user-facing copy when forecasts are introduced.
