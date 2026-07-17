# Direct browser smoke blocker

The app can open Dynamical's public NOAA HRRR 48-hour virtual Icechunk repository and find the smoke variable from `test.ipynb`:

- Dataset id: `noaa-hrrr-forecast-48-hour-virtual`
- Catalog: `https://dynamical.org/catalog/noaa-hrrr-forecast-48-hour-virtual/`
- STAC collection: `https://stac.dynamical.org/noaa-hrrr-forecast-48-hour-virtual/collection.json`
- Icechunk repository: `https://dynamical-noaa-hrrr.s3.us-west-2.amazonaws.com/noaa-hrrr-forecast-48-hour-virtual/v0.5.0.icechunk`
- Variable: `mass_density_8m`
- Virtual chunks: `s3://noaa-hrrr-bdp-pds/`

The remaining blocker is tile decoding in the browser. The first smoke chunk read fails in `zarrita` with:

```text
UnknownCodecError: Unknown codec: gribberish
```

That codec is used by the virtual GRIB-backed chunks. Until a browser-compatible `gribberish` codec is registered with `zarrita`, direct browser rendering can open metadata but cannot decode smoke tile values.
