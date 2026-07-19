import type { ShaderModule } from "@luma.gl/shadertools";
import type { RasterModule } from "@developmentseed/deck.gl-raster/gpu-modules";
import type { Texture } from "@luma.gl/core";
import { SMOKE_RENDERING, type SmokeColorStop } from "./metadata";
import type { SmokeGpuTileData } from "./npy-tile";

export type Rgba = readonly [number, number, number, number];

type SmokeModuleProps = {
  smokeTexture: Texture;
};

function rgba([red, green, blue, alpha]: Rgba): string {
  return `vec4(${red / 255}, ${green / 255}, ${blue / 255}, ${alpha / 255})`;
}

function glslFloat(value: number): string {
  const literal = value.toString();
  return /[.eE]/.test(literal) ? literal : `${literal}.0`;
}

function shaderBranches(stops: readonly SmokeColorStop[]): string {
  const visibleStops = stops.filter((stop) => Number.isFinite(stop.min) && stop.max > 0);
  const branches = visibleStops.map((stop, index) => {
    const color = rgba(stop.color);
    if (index === visibleStops.length - 1) return `  return ${color};`;
    return `  if (value < ${glslFloat(stop.max)}) return ${color};`;
  });
  return [`  if (!(value > 0.0) || isnan(value) || isinf(value)) return vec4(0.0);`, ...branches, "  return vec4(0.0);"].join("\n");
}

export function smokeShaderSource(): string {
  return `precision highp float;\nprecision highp int;\nuniform sampler2D smokeTexture;\n\nvec4 smokeColor(float value) {\n${shaderBranches(SMOKE_RENDERING.colorStops)}\n}`;
}

export function createSmokeRenderModule(): ShaderModule<SmokeModuleProps> {
  return {
    name: "smoke-density",
    inject: {
      "fs:#decl": smokeShaderSource(),
      "fs:DECKGL_FILTER_COLOR": `\n  color = smokeColor(texture(smokeTexture, geometry.uv).r);\n`,
    },
    getUniforms: (props) => ({ smokeTexture: props.smokeTexture }),
  };
}

export function renderSmokeTileWithGpu(tile: SmokeGpuTileData): { renderPipeline: RasterModule[] } {
  return { renderPipeline: [{ module: createSmokeRenderModule(), props: { smokeTexture: tile.smokeTexture } }] };
}

export function smokeColorForValue(value: number): Rgba {
  if (!(value > 0) || !Number.isFinite(value)) return [0, 0, 0, 0];
  return SMOKE_RENDERING.colorStops.find((stop) => value >= stop.min && value < stop.max)?.color ?? [0, 0, 0, 0];
}

export function renderSmokeTileCpu(tile: SmokeGpuTileData): ImageData {
  const pixels = new Uint8ClampedArray(tile.width * tile.height * 4);
  for (let index = 0; index < tile.width * tile.height; index += 1) {
    const [red, green, blue, alpha] = smokeColorForValue(Number(tile.ndarray.data[index]));
    pixels.set([red, green, blue, alpha], index * 4);
  }
  return new ImageData(pixels, tile.width, tile.height);
}
