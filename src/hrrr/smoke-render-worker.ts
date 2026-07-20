/// <reference lib="webworker" />

import { SMOKE_RENDERING } from "./metadata";
import type { SupportedTileArray } from "./npy-tile";

type RenderRequest = {
  id: number;
  data: SupportedTileArray;
  width: number;
  height: number;
};

type RenderResponse = {
  id: number;
  pixels: ArrayBuffer;
};

function colorForValue(value: number): readonly [number, number, number, number] {
  if (!(value > 0) || !Number.isFinite(value)) return [0, 0, 0, 0];
  return SMOKE_RENDERING.colorStops.find((stop) => value >= stop.min && value < stop.max)?.color ?? [0, 0, 0, 0];
}

const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = (event: MessageEvent<RenderRequest>) => {
  const { id, data, width, height } = event.data;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    pixels.set(colorForValue(Number(data[index])), index * 4);
  }

  worker.postMessage({ id, pixels: pixels.buffer } satisfies RenderResponse, [pixels.buffer]);
};
