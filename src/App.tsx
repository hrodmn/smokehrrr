import { MapboxOverlay } from "@deck.gl/mapbox";
import type { DeckProps } from "@deck.gl/core";
import { createColormapTexture, decodeColormapSprite } from "@developmentseed/deck.gl-raster/gpu-modules";
import colormapsPngUrl from "@developmentseed/deck.gl-raster/gpu-modules/colormaps.png";
import { ZarrLayer } from "@developmentseed/deck.gl-zarr";
import type { Device, Texture } from "@luma.gl/core";
import "maplibre-gl/dist/maplibre-gl.css";
import { useControl } from "react-map-gl/maplibre";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Map } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import { getTileData, type SmokeTileData } from "./hrrr/get-tile-data";
import { HRRR_GEOZARR_ATTRS, RESCALE_MAX, RESCALE_MIN } from "./hrrr/metadata";
import { makeRenderTile } from "./hrrr/render-tile";
import { buildSelection, selectLatestZeroHour } from "./hrrr/selection";
import { openSmokeSource, type SmokeSource } from "./hrrr/store";
import { initialStatus, type AppStatus } from "./app-state";
import { Legend } from "./ui/Legend";
import { StatusPanel } from "./ui/StatusPanel";

function DeckGlOverlay(props: DeckProps & { interleaved?: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

export default function App() {
  const [source, setSource] = useState<SmokeSource | null>(null);
  const [status, setStatus] = useState<AppStatus>(initialStatus);
  const [device, setDevice] = useState<Device | null>(null);
  const [colormapImage, setColormapImage] = useState<ImageData | null>(null);
  const [colormapTexture, setColormapTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    openSmokeSource()
      .then((opened) => {
        if (cancelled) return;
        setSource(opened);
        setStatus({ state: "ready", variable: opened.variable, analysisTime: "latest zero-hour run" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus({ state: "error", message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch(colormapsPngUrl);
      const image = await decodeColormapSprite(await response.arrayBuffer());
      if (!cancelled) setColormapImage(image);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (device && colormapImage) {
      setColormapTexture(createColormapTexture(device, colormapImage));
    }
  }, [device, colormapImage]);

  const selection = useMemo(() => {
    if (!source) return null;
    return buildSelection(
      selectLatestZeroHour({ initTimes: Array.from({ length: source.array.shape[0] ?? 0 }), leadTimes: Array.from({ length: source.array.shape[1] ?? 0 }, (_, i) => i) }),
    );
  }, [source]);

  const renderTile = useCallback(
    (data: SmokeTileData) => {
      if (!colormapTexture || !source) return { renderPipeline: [] };
      return makeRenderTile({
        colormapTexture,
        colormapIndex: 0,
        colormapReversed: false,
        noDataValue: source.noDataValue,
        rescaleMin: RESCALE_MIN,
        rescaleMax: RESCALE_MAX,
      })(data);
    },
    [colormapTexture, source],
  );

  const layers = source && selection && colormapTexture
    ? [
        new ZarrLayer({
          id: `hrrr-smoke-${source.variable}`,
          node: source.array,
          metadata: HRRR_GEOZARR_ATTRS,
          selection,
          getTileData,
          renderTile,
          onTileUnload: (tile) => (tile.content as SmokeTileData | undefined)?.texture.destroy(),
          maxCacheSize: 8,
        }),
      ]
    : [];

  return (
    <main className="app-shell">
      <Map initialViewState={{ longitude: -98.5, latitude: 39.8, zoom: 3.4 }} mapStyle={mapStyle}>
        <DeckGlOverlay layers={layers} interleaved onDeviceInitialized={setDevice} />
      </Map>
      <StatusPanel status={status} />
      <Legend />
    </main>
  );
}
