import { beforeAll, describe, expect, it } from "vitest";
import type { NdArrayTile } from "./npy-tile";
import { renderSmokeArrayImageData, sampleSmokeFrameValue, smokeFrameLoadErrorMessage, type SmokeFrameArray } from "./smoke-array-layer";

function smokeArray(values: number[], width: number, height: number): SmokeFrameArray {
  const data = new Float32Array(values);
  const ndarray: NdArrayTile = {
    data,
    dtype: "f4",
    shape: [height, width],
    fortranOrder: false,
    width,
    height,
    bandCount: 1,
    byteLength: data.byteLength,
  };
  return { ndarray, byteLength: data.byteLength };
}

beforeAll(() => {
  globalThis.ImageData ??= class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  } as typeof ImageData;
});

describe("sampleSmokeFrameValue", () => {
  it("samples the nearest smoke value from lon/lat", () => {
    const array = smokeArray([1, 2, 3, 4], 2, 2);

    expect(sampleSmokeFrameValue(array, -134.12, 52.62)).toBe(1);
    expect(sampleSmokeFrameValue(array, -60.9, 21.12)).toBe(4);
    expect(sampleSmokeFrameValue(array, -140, 40)).toBeNull();
  });

  it("uses WebMercator row spacing to match the rendered bbox image", () => {
    const values = Array.from({ length: 101 }, (_, row) => row);

    expect(sampleSmokeFrameValue(smokeArray(values, 1, 101), -100, 35)).toBe(61);
  });
});

describe("smokeFrameLoadErrorMessage", () => {
  it("explains likely HRRR upload lag for 404s", () => {
    expect(smokeFrameLoadErrorMessage(404)).toContain("not in the NOAA S3 archive yet");
  });
});

describe("renderSmokeArrayImageData", () => {
  it("colors a raw smoke array without refetching rendered imagery", () => {
    const image = renderSmokeArrayImageData(smokeArray([0, 1, 10], 3, 1));

    expect(image.width).toBe(3);
    expect(image.height).toBe(1);
    expect(Array.from(image.data.slice(0, 12))).toEqual([
      0, 0, 0, 0,
      177, 211, 225, 255,
      72, 148, 102, 255,
    ]);
  });
});
