import type { SmokeFrame } from "./hrrr/time";

export type AppStatus =
  | { state: "loading"; message: string }
  | { state: "ready"; variable: string; frame: SmokeFrame }
  | { state: "error"; message: string };

export function initialStatus(): AppStatus {
  return { state: "loading", message: "Finding latest HRRR smoke run…" };
}
