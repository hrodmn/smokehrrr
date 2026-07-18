import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map as MapLibreMap, Source } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import { initialStatus, type AppStatus } from "./app-state";
import { findLatestSmokeRun } from "./hrrr/availability";
import { cacheSmokeFrame, preloadSmokeFrames, smokeFrameImageUrl, type SmokeFrameCache, type SmokeFrameLoadState } from "./hrrr/image-cache";
import { HRRR_CONUS_IMAGE_COORDINATES, SMOKE_LAYER, SMOKE_RENDERINGS, TITILER_BASE_URL, type SmokeRenderingId } from "./hrrr/metadata";
import { buildSmokeFrames, type SmokeFrame } from "./hrrr/time";
import { Legend } from "./ui/Legend";
import { StatusPanel } from "./ui/StatusPanel";
import { frameIndexes, TimeControl, type PlaybackRange } from "./ui/TimeControl";

type Theme = "dark" | "light";

const cartoTiles = {
  dark: {
    base: "https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
    labels: "https://basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
  },
  light: {
    base: "https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
    labels: "https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png",
  },
};

function mapStyle(theme: Theme): StyleSpecification {
  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: [cartoTiles[theme].base],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO",
      },
    },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
}

function imageUrl(frame: SmokeFrame, rendering: SmokeRenderingId): string {
  return smokeFrameImageUrl(TITILER_BASE_URL, frame, rendering);
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>(initialStatus);
  const [frames, setFrames] = useState<SmokeFrame[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [smokeUrl, setSmokeUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [rendering, setRendering] = useState<SmokeRenderingId>("density");
  const [playing, setPlaying] = useState<PlaybackRange | null>(null);
  const [frameLoadStates, setFrameLoadStates] = useState<Record<string, SmokeFrameLoadState>>({});
  const frameCache = useRef<SmokeFrameCache>(new Map());
  const setFrameLoadState = useCallback((frameId: string, state: SmokeFrameLoadState) => {
    frameCache.current.set(frameId, state);
    setFrameLoadStates(Object.fromEntries(frameCache.current));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    findLatestSmokeRun({ titilerBaseUrl: TITILER_BASE_URL, signal: controller.signal })
      .then((latestRun) => {
        const nextFrames = buildSmokeFrames({ latestRun });
        const latestAnalysisIndex = nextFrames.findIndex((frame) => frame.id === `${latestRun.date}T${String(latestRun.hour).padStart(2, "0")}Z-f000`);
        const selectedIndex = Math.max(latestAnalysisIndex, 0);
        const selectedFrame = nextFrames[selectedIndex];
        setFrames(nextFrames);
        setSelectedFrameIndex(selectedIndex);
        if (selectedFrame) {
          setStatus({ state: "loading", message: `Loading ${selectedFrame.label}…` });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus({ state: "error", message: error instanceof Error ? error.message : String(error) });
      });

    return () => controller.abort();
  }, []);

  const selectedFrame = frames[selectedFrameIndex];

  useEffect(() => {
    if (!selectedFrame) return;

    const cached = frameCache.current.get(selectedFrame.id);
    if (cached === "loaded") {
      setSmokeUrl(imageUrl(selectedFrame, rendering));
      setStatus({ state: "ready", variable: SMOKE_RENDERINGS[rendering].label, frame: selectedFrame });
      return;
    }
    if (cached === "error") {
      setStatus({ state: "error", message: `${selectedFrame.label} is unavailable. Showing the last available frame.` });
      return;
    }

    const controller = new AbortController();
    setFrameLoadState(selectedFrame.id, "loading");
    setStatus({ state: "loading", message: `Loading ${selectedFrame.label}…` });

    cacheSmokeFrame(TITILER_BASE_URL, selectedFrame, controller.signal)
      .then((available) => {
        setFrameLoadState(selectedFrame.id, available ? "loaded" : "error");
        if (!available) {
          setStatus({ state: "error", message: `${selectedFrame.label} is unavailable. Showing the last available frame.` });
          return;
        }
        setSmokeUrl(imageUrl(selectedFrame, rendering));
        setStatus({ state: "ready", variable: SMOKE_RENDERINGS[rendering].label, frame: selectedFrame });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFrameLoadState(selectedFrame.id, "error");
        setStatus({ state: "error", message: error instanceof Error ? error.message : String(error) });
      });

    return () => controller.abort();
  }, [selectedFrame, rendering, setFrameLoadState]);

  useEffect(() => {
    if (frames.length === 0) return;
    const controller = new AbortController();
    void preloadSmokeFrames({
      titilerBaseUrl: TITILER_BASE_URL,
      frames,
      currentIndex: selectedFrameIndex,
      cache: frameCache.current,
      signal: controller.signal,
      onFrameState: setFrameLoadState,
    });
    return () => controller.abort();
  }, [frames, selectedFrameIndex, setFrameLoadState]);

  useEffect(() => {
    if (!playing) return;
    const indexes = frameIndexes(frames, playing);
    if (indexes.length === 0) {
      setPlaying(null);
      return;
    }

    const timer = window.setInterval(() => {
      setSelectedFrameIndex((current) => indexes[(indexes.indexOf(current) + 1) % indexes.length] ?? indexes[0]);
    }, 900);
    return () => window.clearInterval(timer);
  }, [frames, playing]);

  const imageCoordinates = useMemo(
    () => HRRR_CONUS_IMAGE_COORDINATES.map((point) => [...point]) as [[number, number], [number, number], [number, number], [number, number]],
    [],
  );
  const currentMapStyle = useMemo(() => mapStyle(theme), [theme]);

  return (
    <main className={`app-shell ${theme}`}>
      <MapLibreMap initialViewState={{ longitude: -98.5, latitude: 39.8, zoom: 3.4 }} mapStyle={currentMapStyle}>
        {smokeUrl ? (
          <Source key={smokeUrl} id="hrrr-smoke" type="image" url={smokeUrl} coordinates={imageCoordinates}>
            <Layer id="hrrr-smoke" type="raster" paint={{ "raster-opacity": SMOKE_LAYER.opacity }} />
          </Source>
        ) : null}
        <Source key={theme} id={`carto-labels-${theme}`} type="raster" tiles={[cartoTiles[theme].labels]} tileSize={256}>
          <Layer id="carto-labels" type="raster" />
        </Source>
      </MapLibreMap>
      <div className="panel map-toggles" aria-label="Map display controls">
        <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "Light map" : "Dark map"}
        </button>
        <button type="button" className={rendering === "density" ? "active" : ""} onClick={() => setRendering("density")} aria-pressed={rendering === "density"}>
          Density
        </button>
        <button type="button" className={rendering === "aqi" ? "active" : ""} onClick={() => setRendering("aqi")} aria-pressed={rendering === "aqi"}>
          AQI
        </button>
      </div>
      <StatusPanel status={status} />
      <TimeControl
        frames={frames}
        selectedIndex={selectedFrameIndex}
        playing={playing}
        frameLoadStates={frameLoadStates}
        onSelectedIndexChange={(index) => {
          setPlaying(null);
          setSelectedFrameIndex(index);
        }}
        onPlay={(range) => {
          const [first] = frameIndexes(frames, range);
          if (first !== undefined) setSelectedFrameIndex(first);
          setPlaying(range);
        }}
        onStop={() => setPlaying(null)}
      />
      <Legend rendering={rendering} />
    </main>
  );
}
