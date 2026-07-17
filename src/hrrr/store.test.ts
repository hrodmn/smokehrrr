import { describe, expect, it } from "vitest";
import { validateSmokeArray } from "./store";

const attrs = {};

describe("validateSmokeArray", () => {
  it("accepts the expected HRRR smoke cube", () => {
    expect(validateSmokeArray({ dtype: "float64", shape: [10, 49, 1059, 1799], attrs }, "mass_density_8m")).toBeNaN();
  });

  it("rejects unexpected dtype", () => {
    expect(() => validateSmokeArray({ dtype: "int16", shape: [10, 49, 1059, 1799], attrs }, "smoke")).toThrow("Expected smoke to be float32 or float64");
  });

  it("rejects missing HRRR dimensions", () => {
    expect(() => validateSmokeArray({ dtype: "float32", shape: [1059, 1799], attrs }, "smoke")).toThrow("Expected smoke dimensions");
  });
});
