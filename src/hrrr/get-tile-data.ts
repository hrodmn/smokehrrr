import type { MinimalTileData } from "@developmentseed/deck.gl-raster";
import type { GetTileDataOptions } from "@developmentseed/deck.gl-zarr";
import type { Texture } from "@luma.gl/core";
import * as zarr from "zarrita";

export type SmokeTileData = MinimalTileData & {
  texture: Texture;
};

export async function getTileData(
  array: zarr.Array<"float32" | "float64", zarr.Readable>,
  options: GetTileDataOptions,
): Promise<SmokeTileData> {
  const { device, sliceSpec, width, height, signal } = options;
  const chunk = await zarr.get(array, sliceSpec, { signal });

  if (chunk.shape.length !== 2) {
    throw new Error(`Expected 2D smoke tile, got [${chunk.shape.join(", ")}]`);
  }
  if (chunk.shape[0] !== height || chunk.shape[1] !== width) {
    throw new Error(`Tile shape mismatch: expected [${height}, ${width}], got [${chunk.shape.join(", ")}]`);
  }

  const data = chunk.data instanceof Float32Array ? chunk.data : Float32Array.from(chunk.data as Float64Array);

  const texture = device.createTexture({
    format: "r32float",
    width,
    height,
    data,
    sampler: {
      minFilter: "nearest",
      magFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    },
  });

  return { texture, width, height, byteLength: data.byteLength };
}
