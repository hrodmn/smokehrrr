import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap } from "react-map-gl/maplibre";
import type { Layer } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import { initialStatus, type AppStatus } from "./app-state";
import { findLatestSmokeRun } from "./hrrr/availability";
import { SMOKE_RENDERING, TITILER_BASE_URL } from "./hrrr/metadata";
import { buildSmokeFrames, type SmokeFrame } from "./hrrr/time";
import { createSmokeArrayLayer, fetchSmokeFrameArray, sampleSmokeFrameValue, type SmokeFrameArray } from "./hrrr/smoke-array-layer";
import { DeckGlOverlay } from "./ui/DeckGlOverlay";
import { Legend } from "./ui/Legend";
import { StatusPanel } from "./ui/StatusPanel";
import { frameIndexes, nearestLoadedFrameIndex, TimeControl, type PlaybackRange, type SmokeFrameLoadState } from "./ui/TimeControl";
import { TimeSeriesPanel, type TimeSeriesPoint } from "./ui/TimeSeriesPanel";
import { shouldShowWelcome, WelcomeDialog } from "./ui/WelcomeDialog";

type SmokeFrameCache = Map<string, SmokeFrameLoadState>;
type SmokeArrayCache = Map<string, SmokeFrameArray>;
type SmokeImageCache = Map<string, ImageData>;
type RenderResponse = { id: number; pixels: ArrayBuffer };

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
      labels: {
        type: "raster",
        tiles: [cartoTiles[theme].labels],
        tileSize: 256,
      },
    },
    layers: [
      { id: "base", type: "raster", source: "base" },
      { id: "carto-labels", type: "raster", source: "labels" },
    ],
  };
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>(initialStatus);
  const [frames, setFrames] = useState<SmokeFrame[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [smokeArrays, setSmokeArrays] = useState<Record<string, SmokeFrameArray>>({});
  const [smokeImages, setSmokeImages] = useState<Record<string, ImageData>>({});
  const [theme, setTheme] = useState<Theme>("dark");
  const [playing, setPlaying] = useState<PlaybackRange | null>(null);
  const [samplePoint, setSamplePoint] = useState<TimeSeriesPoint | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(shouldShowWelcome);
  const [frameLoadStates, setFrameLoadStates] = useState<Record<string, SmokeFrameLoadState>>({});
  const frameCache = useRef<SmokeFrameCache>(new Map());
  const smokeArrayCache = useRef<SmokeArrayCache>(new Map());
  const smokeImageCache = useRef<SmokeImageCache>(new Map());
  const smokeRenderWorker = useRef<Worker | null>(null);
  const nextRenderId = useRef(0);
  const inflightArrayLoads = useRef<Map<string, Promise<SmokeFrameArray>>>(new Map());
  const setFrameLoadState = useCallback((frameId: string, state: SmokeFrameLoadState) => {
    frameCache.current.set(frameId, state);
    setFrameLoadStates(Object.fromEntries(frameCache.current));
  }, []);
  const setSmokeArray = useCallback((frameId: string, array: SmokeFrameArray) => {
    smokeArrayCache.current.set(frameId, array);
    setSmokeArrays(Object.fromEntries(smokeArrayCache.current));
  }, []);
  const setSmokeImage = useCallback((frameId: string, imageData: ImageData) => {
    smokeImageCache.current.set(frameId, imageData);
    setSmokeImages(Object.fromEntries(smokeImageCache.current));
  }, []);
  const renderSmokeImage = useCallback(
    (frameId: string, array: SmokeFrameArray) =>
      new Promise<ImageData>((resolve, reject) => {
        const worker = smokeRenderWorker.current ?? new Worker(new URL("./hrrr/smoke-render-worker.ts", import.meta.url), { type: "module" });
        smokeRenderWorker.current = worker;
        const id = nextRenderId.current++;
        const cleanup = () => {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
        };
        const onMessage = (event: MessageEvent<RenderResponse>) => {
          if (event.data.id !== id) return;
          cleanup();
          const imageData = new ImageData(new Uint8ClampedArray(event.data.pixels), array.ndarray.width, array.ndarray.height);
          setSmokeImage(frameId, imageData);
          resolve(imageData);
        };
        const onError = (event: ErrorEvent) => {
          cleanup();
          reject(event.error instanceof Error ? event.error : new Error(event.message));
        };
        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
        worker.postMessage({ id, data: array.ndarray.data, width: array.ndarray.width, height: array.ndarray.height });
      }),
    [setSmokeImage],
  );
  const loadSmokeArray = useCallback(
    (frame: SmokeFrame) => {
      const cachedArray = smokeArrayCache.current.get(frame.id);
      if (cachedArray && smokeImageCache.current.has(frame.id)) return Promise.resolve(cachedArray);
      if (frameCache.current.get(frame.id) === "error") return Promise.reject(new Error(`${frame.label} is unavailable`));

      const inflight = inflightArrayLoads.current.get(frame.id);
      if (inflight) return inflight;

      setFrameLoadState(frame.id, "loading");
      const load = (cachedArray ? Promise.resolve(cachedArray) : fetchSmokeFrameArray({ titilerBaseUrl: TITILER_BASE_URL, frame }).then((array) => {
        setSmokeArray(frame.id, array);
        return array;
      }))
        .then((array) => renderSmokeImage(frame.id, array).then(() => array))
        .then((array) => {
          setFrameLoadState(frame.id, "loaded");
          return array;
        })
        .catch((error: unknown) => {
          setFrameLoadState(frame.id, "error");
          throw error;
        })
        .finally(() => {
          inflightArrayLoads.current.delete(frame.id);
        });

      inflightArrayLoads.current.set(frame.id, load);
      return load;
    },
    [renderSmokeImage, setFrameLoadState, setSmokeArray],
  );

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

  useEffect(() => {
    return () => smokeRenderWorker.current?.terminate();
  }, []);

  const selectedFrame = frames[selectedFrameIndex];

  useEffect(() => {
    if (!selectedFrame) return;

    const cached = frameCache.current.get(selectedFrame.id);
    if (cached === "loaded") {
      setStatus({ state: "ready", variable: SMOKE_RENDERING.label, frame: selectedFrame });
      return;
    }
    if (cached === "error") {
      setStatus({ state: "error", message: `${selectedFrame.label} is unavailable.` });
      return;
    }

    let active = true;
    setStatus({ state: "loading", message: `Loading ${selectedFrame.label}…` });

    loadSmokeArray(selectedFrame)
      .then(() => {
        if (active) setStatus({ state: "ready", variable: SMOKE_RENDERING.label, frame: selectedFrame });
      })
      .catch((error: unknown) => {
        if (active) setStatus({ state: "error", message: error instanceof Error ? error.message : String(error) });
      });

    return () => {
      active = false;
    };
  }, [loadSmokeArray, selectedFrame]);

  useEffect(() => {
    if (frames.length === 0) return;
    let cancelled = false;
    const eagerFrames = selectedFrame ? [selectedFrame, ...frames.filter((frame) => frame.id !== selectedFrame.id)] : frames;

    void (async () => {
      const workers = Array.from({ length: 2 }, async (_, workerIndex) => {
        for (let index = workerIndex; index < eagerFrames.length && !cancelled; index += 2) {
          await loadSmokeArray(eagerFrames[index]).catch(() => undefined);
        }
      });
      await Promise.all(workers);
    })();

    return () => {
      cancelled = true;
    };
  }, [frames, loadSmokeArray, selectedFrame]);

  useEffect(() => {
    if (!selectedFrame || frameLoadStates[selectedFrame.id] !== "error") return;
    const index = nearestLoadedFrameIndex(selectedFrameIndex, frames, frameLoadStates);
    if (index !== selectedFrameIndex && frameLoadStates[frames[index]?.id] === "loaded") setSelectedFrameIndex(index);
  }, [frameLoadStates, frames, selectedFrame, selectedFrameIndex]);

  useEffect(() => {
    if (!playing) return;
    const indexes = frameIndexes(frames, playing, frameLoadStates);
    if (indexes.length === 0) {
      setPlaying(null);
      return;
    }

    const timer = window.setInterval(() => {
      setSelectedFrameIndex((current) => indexes[(indexes.indexOf(current) + 1) % indexes.length] ?? indexes[0]);
    }, 900);
    return () => window.clearInterval(timer);
  }, [frameLoadStates, frames, playing]);

  const currentMapStyle = useMemo(() => mapStyle(theme), [theme]);
  const smokeLayers = useMemo<Layer[]>(() => {
    if (!selectedFrame || frameCache.current.get(selectedFrame.id) !== "loaded") return [];
    const imageData = smokeImageCache.current.get(selectedFrame.id);
    return imageData ? [createSmokeArrayLayer({ frame: selectedFrame, imageData })] : [];
  }, [frameLoadStates, selectedFrame, smokeImages]);
  const sampleLocation = useCallback(
    (longitude: number, latitude: number) => {
      const array = selectedFrame ? smokeArrayCache.current.get(selectedFrame.id) : null;
      if (!array || sampleSmokeFrameValue(array, longitude, latitude) === null) return;
      setSamplePoint({ longitude, latitude });
    },
    [selectedFrame],
  );

  return (
    <main className={`app-shell ${theme}`}>
      <MapLibreMap
        initialViewState={{ longitude: -98.5, latitude: 39.8, zoom: 3.4 }}
        mapStyle={currentMapStyle}
        onClick={(event: { lngLat: { lng: number; lat: number } }) => sampleLocation(event.lngLat.lng, event.lngLat.lat)}
        onContextMenu={(event: { preventDefault: () => void; lngLat: { lng: number; lat: number } }) => {
          event.preventDefault();
          sampleLocation(event.lngLat.lng, event.lngLat.lat);
        }}
      >
        <DeckGlOverlay layers={smokeLayers} />
      </MapLibreMap>
      <StatusPanel
        status={status}
        theme={theme}
        onInfoClick={() => setWelcomeOpen(true)}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <WelcomeDialog open={welcomeOpen} onClose={() => setWelcomeOpen(false)} />
      {samplePoint ? <TimeSeriesPanel frames={frames} arrays={smokeArrays} point={samplePoint} onClose={() => setSamplePoint(null)} /> : null}
      <div className="bottom-stack">
        <TimeControl
          frames={frames}
          selectedIndex={selectedFrameIndex}
          playing={playing}
          frameLoadStates={frameLoadStates}
          onSelectedIndexChange={(index) => {
            setPlaying(null);
            const nearestLoaded = nearestLoadedFrameIndex(index, frames, frameLoadStates);
            setSelectedFrameIndex(frameLoadStates[frames[nearestLoaded]?.id] === "loaded" ? nearestLoaded : index);
          }}
          onPlay={(range) => {
            const [first] = frameIndexes(frames, range, frameLoadStates);
            if (first !== undefined) setSelectedFrameIndex(first);
            setPlaying(range);
          }}
          onStop={() => setPlaying(null)}
        />
        <Legend />
      </div>
    </main>
  );
}
