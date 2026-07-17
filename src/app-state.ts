export type AppStatus =
  | { state: "loading"; message: string }
  | { state: "ready"; variable: string; analysisTime: string }
  | { state: "error"; message: string };

export function initialStatus(): AppStatus {
  return { state: "loading", message: "Opening HRRR Icechunk source…" };
}
