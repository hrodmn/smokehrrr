import type { RenderTileResult } from "@developmentseed/deck.gl-raster";
import { Colormap, CreateTexture, FilterNoDataVal, LinearRescale } from "@developmentseed/deck.gl-raster/gpu-modules";
import type { Texture } from "@luma.gl/core";
import type { SmokeTileData } from "./get-tile-data";

export type SmokeStyle = {
  colormapTexture: Texture;
  colormapIndex: number;
  colormapReversed: boolean;
  noDataValue: number;
  rescaleMin: number;
  rescaleMax: number;
};

export function makeRenderTile(style: SmokeStyle) {
  return function renderTile(data: SmokeTileData): RenderTileResult {
    return {
      renderPipeline: [
        { module: CreateTexture, props: { textureName: data.texture } },
        { module: FilterNoDataVal, props: { value: style.noDataValue } },
        { module: LinearRescale, props: { rescaleMin: style.rescaleMin, rescaleMax: style.rescaleMax } },
        {
          module: Colormap,
          props: {
            colormapTexture: style.colormapTexture,
            colormapIndex: style.colormapIndex,
            reversed: style.colormapReversed,
          },
        },
      ],
    };
  };
}
