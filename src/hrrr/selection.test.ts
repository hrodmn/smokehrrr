import { describe, expect, it } from "vitest";
import { selectLatestZeroHour } from "./selection";

describe("selectLatestZeroHour", () => {
  it("chooses the final init time and zero-hour lead", () => {
    expect(selectLatestZeroHour({ initTimes: ["a", "b", "c"], leadTimes: [0, 1, 2] })).toMatchObject({ init_time: 2, lead_time: 0 });
  });

  it("finds zero-hour when it is not the first lead", () => {
    expect(selectLatestZeroHour({ initTimes: ["a"], leadTimes: [3600, 0] }).lead_time).toBe(1);
  });

  it("fails clearly when zero-hour is missing", () => {
    expect(() => selectLatestZeroHour({ initTimes: ["a"], leadTimes: [3600] })).toThrow("No zero-hour HRRR lead time");
  });
});
