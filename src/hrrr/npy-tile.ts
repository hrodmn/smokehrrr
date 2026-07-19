import type { Device, Texture } from "@luma.gl/core";
import Npyjs, { type DType } from "npyjs";

export type SupportedTileArray = Uint8Array | Int16Array | Uint16Array | Float32Array | Float64Array;

export type NdArrayTile = {
  data: SupportedTileArray;
  dtype: DType;
  shape: number[];
  fortranOrder: boolean;
  width: number;
  height: number;
  bandCount: number;
  byteLength: number;
};

export type SmokeGpuTileData = {
  ndarray: NdArrayTile;
  width: number;
  height: number;
  byteLength: number;
  smokeTexture: Texture;
};

const npy = new Npyjs();

function isSupportedTileArray(value: ArrayBufferView): value is SupportedTileArray {
  return value instanceof Uint8Array || value instanceof Int16Array || value instanceof Uint16Array || value instanceof Float32Array || value instanceof Float64Array;
}

export function getSmokeTileShape(shape: number[]): { width: number; height: number; bandCount: number } {
  if (shape.length === 2) {
    const [height, width] = shape;
    return { width, height, bandCount: 1 };
  }

  if (shape.length === 3) {
    const [bandCount, height, width] = shape;
    if (bandCount === 1 || bandCount === 2) return { width, height, bandCount };
  }

  throw new Error(`Unsupported smoke tile shape ${JSON.stringify(shape)}. Expected [height,width], [1,height,width], or [2,height,width].`);
}

export async function decodeNpyTile(source: ArrayBuffer | ArrayBufferView | Blob): Promise<NdArrayTile> {
  const parsed = await npy.load(source as ArrayBuffer);

  if (parsed.fortranOrder) throw new Error("Fortran-ordered ndarray tiles are not supported.");
  if (!isSupportedTileArray(parsed.data)) throw new Error(`Unsupported ndarray typed array: ${parsed.data.constructor.name}`);

  const { width, height, bandCount } = getSmokeTileShape(parsed.shape);
  return {
    data: parsed.data,
    dtype: parsed.dtype,
    shape: [...parsed.shape],
    fortranOrder: parsed.fortranOrder,
    width,
    height,
    bandCount,
    byteLength: parsed.data.byteLength,
  };
}

export function createSmokeTexture(ndarray: NdArrayTile, device?: Device): Texture {
  if (!device) throw new Error("Cannot create smoke tile texture without a luma device.");

  const pixelCount = ndarray.width * ndarray.height;
  const values = new Float32Array(pixelCount);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    values[pixelIndex] = Number(ndarray.data[pixelIndex]);
  }

  return device.createTexture({
    width: ndarray.width,
    height: ndarray.height,
    format: "r32float",
    data: values,
    sampler: {
      minFilter: "nearest",
      magFilter: "nearest",
      mipmapFilter: "none",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    },
  });
}
