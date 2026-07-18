import type { SmokeFrame } from "./time";
import { buildSmokeTitilerUrl } from "./titiler-url";
import { HRRR_CONUS_BBOX, type SmokeRenderingId } from "./metadata";

export type SmokeFrameLoadState = "loading" | "loaded" | "error";
export type SmokeFrameCache = Map<string, SmokeFrameLoadState>;

export function smokeFrameImageUrl(titilerBaseUrl: string, frame: SmokeFrame, rendering: SmokeRenderingId = "density"): string {
  return buildSmokeTitilerUrl({ titilerBaseUrl, run: frame.run, bbox: HRRR_CONUS_BBOX, rendering });
}

export async function cacheSmokeFrame(titilerBaseUrl: string, frame: SmokeFrame, signal?: AbortSignal): Promise<boolean> {
  const response = await fetch(smokeFrameImageUrl(titilerBaseUrl, frame), { method: "GET", cache: "default", signal });
  if (!response.ok) return false;
  await response.blob();
  return true;
}

export async function preloadSmokeFrames(options: {
  titilerBaseUrl: string;
  frames: SmokeFrame[];
  currentIndex: number;
  cache: SmokeFrameCache;
  signal?: AbortSignal;
  onFrameState?: (frameId: string, state: SmokeFrameLoadState) => void;
}): Promise<void> {
  const { titilerBaseUrl, frames, currentIndex, cache, signal, onFrameState } = options;
  const ordered = frames
    .map((frame, index) => ({ frame, index, distance: Math.abs(index - currentIndex) }))
    .filter(({ frame, index }) => index !== currentIndex && !cache.has(frame.id))
    .sort((a, b) => a.distance - b.distance);
  let next = 0;

  async function preloadNext(): Promise<void> {
    while (!signal?.aborted) {
      const item = ordered[next];
      next += 1;
      if (!item) return;

      const { frame } = item;
      cache.set(frame.id, "loading");
      onFrameState?.(frame.id, "loading");
      try {
        const state = (await cacheSmokeFrame(titilerBaseUrl, frame, signal)) ? "loaded" : "error";
        cache.set(frame.id, state);
        onFrameState?.(frame.id, state);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        cache.set(frame.id, "error");
        onFrameState?.(frame.id, "error");
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(3, ordered.length) }, () => preloadNext()));
}
