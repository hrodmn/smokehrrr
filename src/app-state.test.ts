import { describe, expect, it } from "vitest";
import { initialStatus, type AppStatus } from "./app-state";
import { statusText } from "./ui/StatusPanel";

describe("app state", () => {
  it("starts by loading the HRRR source", () => {
    expect(initialStatus()).toEqual({ state: "loading", message: "Opening HRRR Icechunk source…" });
  });

  it("turns data failures into user-visible status text", () => {
    const status: AppStatus = { state: "error", message: "No smoke variable found" };
    expect(statusText(status)).toBe("No smoke variable found");
  });
});
