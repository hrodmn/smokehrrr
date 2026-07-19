import type { Layer } from "@deck.gl/core";
import { RasterTileLayer, TileMatrixSetAdaptor, type GetTileDataOptions } from "@developmentseed/deck.gl-raster";
import type { TileMatrixSet } from "@developmentseed/morecantile";
import type { Texture } from "@luma.gl/core";
import type { _Tile2DHeader as Tile2DHeader, _TileLoadProps as TileLoadProps } from "@deck.gl/geo-layers";
import { SMOKE_LAYER } from "./metadata";
import { createSmokeTexture, decodeNpyTile, type NdArrayTile, type SmokeGpuTileData } from "./npy-tile";
import { renderSmokeTileWithGpu } from "./smoke-gpu-render";
import { buildSmokeNpyTileUrl } from "./titiler-url";
import type { SmokeFrame } from "./time";

const WEB_MERCATOR_WORLD_BOUNDS = 20037508.342789244;

export type TileMatrixSetDescriptor = TileMatrixSetAdaptor;

type TileIndexLike = { index: { x: number; y: number; z: number } };

type SmokeTileLayerData = SmokeGpuTileData | null;

function identity(x: number, y: number): [number, number] {
  return [x, y];
}

function projectFrom4326(lng: number, lat: number): [number, number] {
  const x = (lng * WEB_MERCATOR_WORLD_BOUNDS) / 180;
  const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  return [x, (y * WEB_MERCATOR_WORLD_BOUNDS) / 180];
}

function projectTo4326(x: number, y: number): [number, number] {
  const lng = (x / WEB_MERCATOR_WORLD_BOUNDS) * 180;
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((y / WEB_MERCATOR_WORLD_BOUNDS) * Math.PI)) - Math.PI / 2);
  return [lng, lat];
}

function withBoundingBox(tms: TileMatrixSet): TileMatrixSet {
  if (tms.boundingBox) return tms;
  return {
    ...tms,
    boundingBox: {
      lowerLeft: [-WEB_MERCATOR_WORLD_BOUNDS, -WEB_MERCATOR_WORLD_BOUNDS],
      upperRight: [WEB_MERCATOR_WORLD_BOUNDS, WEB_MERCATOR_WORLD_BOUNDS],
      crs: tms.crs,
      orderedAxes: ["X", "Y"],
    },
  };
}

export async function loadWebMercatorQuadDescriptor(titilerBaseUrl: string, signal?: AbortSignal): Promise<TileMatrixSetDescriptor> {
  const response = await fetch(`${titilerBaseUrl.replace(/\/$/, "")}/tileMatrixSets/WebMercatorQuad`, { signal });
  if (!response.ok) throw new Error(`Failed to load WebMercatorQuad descriptor: ${response.status}`);

  return new TileMatrixSetAdaptor(withBoundingBox((await response.json()) as TileMatrixSet), {
    projectTo3857: identity,
    projectFrom3857: identity,
    projectTo4326,
    projectFrom4326,
  });
}

function getTileIndex(tile: TileIndexLike | TileLoadProps): { x: number; y: number; z: number } {
  return (tile as TileIndexLike).index;
}

async function getSmokeTileData(frame: SmokeFrame, titilerBaseUrl: string, tile: TileLoadProps, options: GetTileDataOptions): Promise<SmokeTileLayerData> {
  const { x, y, z } = getTileIndex(tile);
  const response = await fetch(buildSmokeNpyTileUrl({ titilerBaseUrl, run: frame.run, z, x, y }), { signal: options.signal });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Failed to load smoke tile: ${response.status}`);

  const ndarray: NdArrayTile = await decodeNpyTile(await response.arrayBuffer());
  const smokeTexture = createSmokeTexture(ndarray, options.device);
  return { ndarray, smokeTexture, width: ndarray.width, height: ndarray.height, byteLength: ndarray.byteLength };
}

export function destroySmokeTileResources(tile: SmokeGpuTileData): void {
  tile.smokeTexture.destroy();
}

export function createSmokeDeckLayer(options: {
  frame: SmokeFrame;
  descriptor: TileMatrixSetDescriptor;
  titilerBaseUrl: string;
}): Layer {
  const { frame, descriptor, titilerBaseUrl } = options;

  return new RasterTileLayer<SmokeTileLayerData>({
    id: `hrrr-smoke-${frame.id}`,
    tilesetDescriptor: descriptor,
    tileSize: 256,
    maxRequests: 64,
    refinementStrategy: "best-available",
    opacity: SMOKE_LAYER.opacity,
    getTileData: (tile, tileOptions) => getSmokeTileData(frame, titilerBaseUrl, tile, tileOptions),
    renderTile: (tile) => (tile ? renderSmokeTileWithGpu(tile) : null),
    onTileUnload: (tile: Tile2DHeader<unknown>) => {
      if (tile.content) destroySmokeTileResources(tile.content as SmokeGpuTileData);
    },
  });
}

export function getSmokeTileCacheKey(frame: SmokeFrame, z: number, x: number, y: number): string {
  return `${frame.id}/${z}/${x}/${y}`;
}
