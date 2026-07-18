import { describe, expect, it } from "vitest";
import { SMOKE_RENDERINGS } from "../hrrr/metadata";
import { colorRampBackground } from "./Legend";

describe("colorRampBackground", () => {
  it("uses the smoke layer colormap colors", () => {
    const background = colorRampBackground();

    expect(background).toContain("rgba(255, 255, 255, 0)");
    expect(background).toContain("rgba(127, 31, 172, 1)");
    expect(background).toContain(String(SMOKE_RENDERINGS.density.colormap.at(-1)?.[1][0]));
  });

  it("can use the AQI estimate colors", () => {
    const background = colorRampBackground(SMOKE_RENDERINGS.aqi.colormap);

    expect(background).toContain("rgba(0, 228, 0, 1)");
    expect(background).toContain("rgba(126, 0, 35, 1)");
  });
});
