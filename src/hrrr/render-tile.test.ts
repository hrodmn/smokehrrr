import { describe, expect, it } from "vitest";
import { makeRenderTile } from "./render-tile";

describe("makeRenderTile", () => {
  it("builds the smoke styling pipeline", () => {
    const texture = { id: "tile" };
    const colormapTexture = { id: "colormap" };
    const result = makeRenderTile({
      colormapTexture: colormapTexture as never,
      colormapIndex: 0,
      colormapReversed: false,
      noDataValue: -9999,
      rescaleMin: 0,
      rescaleMax: 1,
    })({ texture: texture as never, width: 1, height: 1, byteLength: 4 });

    const pipeline = result.renderPipeline!;
    expect(pipeline).toHaveLength(4);
    expect(pipeline[1]?.props).toEqual({ value: -9999 });
    expect(pipeline[2]?.props).toEqual({ rescaleMin: 0, rescaleMax: 1 });
  });
});
