import { describe, expect, it } from "vitest";
import { statusText } from "./StatusPanel";

describe("statusText", () => {
  it("shows selected analysis state when loaded", () => {
    expect(statusText({ state: "ready", variable: "smoke", analysisTime: "latest zero-hour run" })).toBe("smoke · latest zero-hour run");
  });

  it("shows data-access blockers", () => {
    expect(statusText({ state: "error", message: "No smoke mass density variable was found" })).toContain("No smoke");
  });
});
