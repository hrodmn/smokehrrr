# Smokehrrr

Static Vite prototype for a smoke-focused HRRR browser.

## Run locally

```bash
npm install
npm run dev
```

Checks:

```bash
npm test
npm run build
```

## Data source

The app attempts to open Dynamical's NOAA HRRR 48-hour virtual Icechunk source directly from the browser:

`https://dynamical.org/catalog/noaa-hrrr-forecast-48-hour-virtual/`

It uses the smoke variable from `test.ipynb`: `mass_density_8m`.

Current blocker: the source opens, but browser chunk reads fail because `zarrita` does not know the virtual chunk codec `gribberish`. See `dev-docs/direct-browser-blocker.md`.

No backend or tile service is used in this MVP.
