import type { Layer } from "@deck.gl/core";
import { BitmapLayer } from "@deck.gl/layers";
import { HRRR_CONUS_BBOX, SMOKE_LAYER } from "./metadata";
import { decodeNpyTile, type NdArrayTile } from "./npy-tile";
import { smokeColorForValue } from "./smoke-gpu-render";
import { buildSmokeNpyBboxUrl } from "./titiler-url";
import type { SmokeFrame } from "./time";

export type SmokeFrameArray = {
  ndarray: NdArrayTile;
  byteLength: number;
};

export function smokeFrameLoadErrorMessage(status: number): string {
  if (status === 404) return "This HRRR forecast file is not in the NOAA S3 archive yet. New runs can lag after model generation; try a recent analysis frame or reload in a few minutes.";
  return `Failed to load smoke array: ${status}`;
}

export async function fetchSmokeFrameArray(options: { frame: SmokeFrame; titilerBaseUrl: string; signal?: AbortSignal }): Promise<SmokeFrameArray> {
  const response = await fetch(buildSmokeNpyBboxUrl({ titilerBaseUrl: options.titilerBaseUrl, run: options.frame.run, bbox: HRRR_CONUS_BBOX }), {
    signal: options.signal,
  });
  if (!response.ok) throw new Error(smokeFrameLoadErrorMessage(response.status));

  const ndarray = await decodeNpyTile(await response.arrayBuffer());
  return { ndarray, byteLength: ndarray.byteLength };
}

const WEB_MERCATOR_WORLD_BOUNDS = 20037508.342789244;

function webMercatorY(latitude: number): number {
  return (Math.log(Math.tan(((90 + latitude) * Math.PI) / 360)) * WEB_MERCATOR_WORLD_BOUNDS) / Math.PI;
}

export function sampleSmokeFrameValue(array: SmokeFrameArray, longitude: number, latitude: number): number | null {
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = HRRR_CONUS_BBOX;
  if (longitude < minLongitude || longitude > maxLongitude || latitude < minLatitude || latitude > maxLatitude) return null;

  const { ndarray } = array;
  const minY = webMercatorY(minLatitude);
  const maxY = webMercatorY(maxLatitude);
  const x = Math.round(((longitude - minLongitude) / (maxLongitude - minLongitude)) * (ndarray.width - 1));
  const y = Math.round(((maxY - webMercatorY(latitude)) / (maxY - minY)) * (ndarray.height - 1));
  const value = Number(ndarray.data[y * ndarray.width + x]);
  return Number.isFinite(value) ? value : null;
}

export function renderSmokeArrayImageData(array: SmokeFrameArray): ImageData {
  const { ndarray } = array;
  const pixels = new Uint8ClampedArray(ndarray.width * ndarray.height * 4);

  for (let index = 0; index < ndarray.width * ndarray.height; index += 1) {
    pixels.set(smokeColorForValue(Number(ndarray.data[index])), index * 4);
  }

  return new ImageData(pixels, ndarray.width, ndarray.height);
}

export function createSmokeArrayLayer(options: { frame: SmokeFrame; array: SmokeFrameArray }): Layer {
  return new BitmapLayer({
    id: `hrrr-smoke-${options.frame.id}`,
    image: renderSmokeArrayImageData(options.array),
    bounds: [...HRRR_CONUS_BBOX],
    opacity: SMOKE_LAYER.opacity,
    beforeId: "carto-labels",
    textureParameters: {
      minFilter: "nearest",
      magFilter: "nearest",
      mipmapFilter: "none",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    },
  });
}
