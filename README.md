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

## Releases and deployment

Release PRs are managed by release-please. When a release is created from `main`, GitHub Actions builds the app with `BASE_PATH=/smokehrrr/` and deploys `dist/` to GitHub Pages.

Set GitHub Pages to use **GitHub Actions** as the source before publishing the first release.

## Data source

Smokehrrr renders [NOAA HRRR](https://rapidrefresh.noaa.gov/hrrr/) surface (8 m) smoke mass density (`MASSDEN`, band 76) from the [NOAA HRRR public data archive](https://registry.opendata.aws/noaa-hrrr-pds/) as TiTiler `.npy` WebMercator tiles, scaled server-side to µg/m³ and colored in the browser with deck.gl-raster.

`https://raster.eoapi.dev/external/tiles/WebMercatorQuad/{z}/{x}/{y}.npy?url=vrt://https://noaa-hrrr-bdp-pds.s3.amazonaws.com/...wrfsfcf00.grib2?bands=76&expression=b1*1000000000`

The timeline includes the previous 24 zero-hour analyses from the latest available run window, plus forecast frames from the latest available HRRR run. Forecast frames use the same TiTiler path with `wrfsfcfXX.grib2` forecast hours. The UI can jump back to current conditions, animate either the recent analysis window or the forecast sequence, and tap or right-click the map to chart cached smoke values at that location.

Set `VITE_TITILER_BASE_URL` to use a different TiTiler deployment.

Forecast frames are model guidance, not observed smoke. Newly generated HRRR forecast files can lag before they land in the NOAA S3 archive, so a 404 for a recent forecast frame usually means the data are not uploaded yet.

The first direct-browser Icechunk path is paused because HRRR virtual chunks use the `gribberish` codec, which `zarrita` cannot decode in the browser today. See `dev-docs/direct-browser-blocker.md`.
