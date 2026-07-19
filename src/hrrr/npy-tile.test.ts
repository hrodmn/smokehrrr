import { describe, expect, it } from "vitest";
import { decodeNpyTile, getSmokeTileShape } from "./npy-tile";

function npyFloat32(values: number[], shape: number[], fortranOrder = false): ArrayBuffer {
  const headerText = `{'descr': '<f4', 'fortran_order': ${fortranOrder ? "True" : "False"}, 'shape': (${shape.join(", ")}${shape.length === 1 ? "," : ""}), }`;
  const magicAndHeaderPrefixLength = 10;
  const padding = " ".repeat((16 - ((magicAndHeaderPrefixLength + headerText.length + 1) % 16)) % 16);
  const header = `${headerText}${padding}\n`;
  const buffer = new ArrayBuffer(magicAndHeaderPrefixLength + header.length + values.length * 4);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  bytes.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0], 0);
  view.setUint16(8, header.length, true);
  bytes.set(new TextEncoder().encode(header), magicAndHeaderPrefixLength);
  values.forEach((value, index) => view.setFloat32(magicAndHeaderPrefixLength + header.length + index * 4, value, true));
  return buffer;
}

describe("getSmokeTileShape", () => {
  it("accepts scalar and data-plus-alpha smoke tile shapes", () => {
    expect(getSmokeTileShape([2, 3])).toEqual({ height: 2, width: 3, bandCount: 1 });
    expect(getSmokeTileShape([1, 2, 3])).toEqual({ height: 2, width: 3, bandCount: 1 });
    expect(getSmokeTileShape([2, 2, 3])).toEqual({ height: 2, width: 3, bandCount: 2 });
  });

  it("rejects generic multi-band shapes", () => {
    expect(() => getSmokeTileShape([3, 2, 3])).toThrow("Unsupported smoke tile shape");
  });
});

describe("decodeNpyTile", () => {
  it("decodes scalar ndarray tiles", async () => {
    const tile = await decodeNpyTile(npyFloat32([1, 2, 3, 4, 5, 6], [2, 3]));

    expect(tile.width).toBe(3);
    expect(tile.height).toBe(2);
    expect(tile.bandCount).toBe(1);
    expect(Array.from(tile.data)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects Fortran-ordered tiles", async () => {
    await expect(decodeNpyTile(npyFloat32([1], [1, 1], true))).rejects.toThrow("Fortran-ordered");
  });
});
