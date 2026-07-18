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

Smokehrrr renders HRRR surface (8 m) smoke mass density (`MASSDEN`, band 76) in µg/m³ through TiTiler as a browser-native PNG overlay. The map can also switch to AQI estimate colors by mapping modeled near-surface smoke mass density to EPA PM2.5 AQI breakpoints; this is not official monitor-derived AQI.

`https://raster.eoapi.dev/external/bbox/...png?url=vrt://https://noaa-hrrr-bdp-pds.s3.amazonaws.com/...wrfsfcf00.grib2?bands=76`

The timeline includes the previous 24 zero-hour analyses from the latest available run window, plus forecast frames from the latest available HRRR run. Forecast frames use the same TiTiler path with `wrfsfcfXX.grib2` forecast hours. The UI can jump back to current conditions or animate either the recent analysis window or the forecast sequence.

Set `VITE_TITILER_BASE_URL` to use a different TiTiler deployment.

Forecast frames are model guidance, not observed smoke.

The first direct-browser Icechunk path is paused because HRRR virtual chunks use the `gribberish` codec, which `zarrita` cannot decode in the browser today. See `dev-docs/direct-browser-blocker.md`.
