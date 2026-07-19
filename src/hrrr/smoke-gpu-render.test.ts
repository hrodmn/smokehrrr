import { describe, expect, it } from "vitest";
import { smokeColorForValue, smokeShaderSource } from "./smoke-gpu-render";

describe("smoke GPU render helpers", () => {
  it("emits human-scale density thresholds", () => {
    const shader = smokeShaderSource();

    expect(shader).toContain("value < 1.0");
    expect(shader).toContain("value < 200.0");
    expect(shader).not.toContain("e-9");
    expect(shader).not.toContain("1.7976931348623157e+308");
  });

  it("maps representative values to density colors", () => {
    expect(smokeColorForValue(0)).toEqual([0, 0, 0, 0]);
    expect(smokeColorForValue(1.5)).toEqual([177, 211, 225, 255]);
  });
});
