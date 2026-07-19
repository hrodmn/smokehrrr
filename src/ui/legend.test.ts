import { describe, expect, it } from "vitest";
import { SMOKE_RENDERING } from "../hrrr/metadata";
import { colorRampBackground } from "./Legend";

describe("colorRampBackground", () => {
  it("uses the smoke layer colormap colors", () => {
    const background = colorRampBackground();

    expect(background).toContain("rgba(255, 255, 255, 0)");
    expect(background).toContain("rgba(127, 31, 172, 1)");
    expect(background).toContain(String(SMOKE_RENDERING.colormap.at(-1)?.[1][0]));
  });
});
