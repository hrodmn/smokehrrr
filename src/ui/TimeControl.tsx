import type { SmokeFrameLoadState } from "../hrrr/image-cache";
import type { SmokeFrame } from "../hrrr/time";

export type PlaybackRange = "analysis" | "forecast";

export function frameBadge(frame: SmokeFrame): string {
  return frame.kind === "forecast" ? "Forecast" : "Analysis";
}

export function timeControlRange(frames: SmokeFrame[]): { min: number; max: number; disabled: boolean } {
  return { min: 0, max: Math.max(frames.length - 1, 0), disabled: frames.length === 0 };
}

export function latestAnalysisFrameIndex(frames: SmokeFrame[]): number {
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    if (frames[index]?.kind === "analysis") return index;
  }
  return -1;
}

export function frameIndexes(frames: SmokeFrame[], kind: PlaybackRange): number[] {
  return frames.flatMap((frame, index) => (frame.kind === kind ? [index] : []));
}

export function timelineMarks(frames: SmokeFrame[]): { index: number; label: string }[] {
  if (frames.length === 0) return [];
  const latestAnalysis = latestAnalysisFrameIndex(frames);
  return [0, latestAnalysis, frames.length - 1]
    .filter((index, position, indexes) => index >= 0 && indexes.indexOf(index) === position)
    .map((index) => ({ index, label: frames[index]?.label.replace(" · valid ", " ").replace("Analysis · ", "") ?? "" }));
}

export function frameLoadSummary(frames: SmokeFrame[], frameLoadStates: Record<string, SmokeFrameLoadState>): string {
  const counts = frames.reduce(
    (total, frame) => {
      total[frameLoadStates[frame.id] ?? "idle"] += 1;
      return total;
    },
    { idle: 0, loading: 0, loaded: 0, error: 0 },
  );
  return `${counts.loaded}/${frames.length} loaded${counts.loading ? ` · ${counts.loading} loading` : ""}${counts.error ? ` · ${counts.error} failed` : ""}`;
}

export function TimeControl({
  frames,
  selectedIndex,
  playing,
  frameLoadStates = {},
  onSelectedIndexChange,
  onPlay,
  onStop,
}: {
  frames: SmokeFrame[];
  selectedIndex: number;
  playing: PlaybackRange | null;
  frameLoadStates?: Record<string, SmokeFrameLoadState>;
  onSelectedIndexChange: (index: number) => void;
  onPlay: (range: PlaybackRange) => void;
  onStop: () => void;
}) {
  const frame = frames[selectedIndex];
  const range = timeControlRange(frames);
  const latestAnalysisIndex = latestAnalysisFrameIndex(frames);
  const marks = timelineMarks(frames);

  return (
    <section className="panel time-control" aria-label="Smoke time control">
      <div className="time-control-header">
        <span className={`badge ${frame?.kind ?? "analysis"}`}>{frame ? frameBadge(frame) : "No frames"}</span>
        <strong>{frame?.label ?? "Waiting for HRRR smoke frames"}</strong>
        {frames.length > 0 ? <span className="load-summary">{frameLoadSummary(frames, frameLoadStates)}</span> : null}
      </div>
      <div className="time-control-actions">
        <button type="button" disabled={latestAnalysisIndex < 0 || selectedIndex === latestAnalysisIndex} onClick={() => onSelectedIndexChange(latestAnalysisIndex)}>
          Current conditions
        </button>
        {playing ? (
          <button type="button" onClick={onStop}>Stop</button>
        ) : (
          <>
            <button type="button" disabled={frameIndexes(frames, "analysis").length === 0} onClick={() => onPlay("analysis")}>Play 24h</button>
            <button type="button" disabled={frameIndexes(frames, "forecast").length === 0} onClick={() => onPlay("forecast")}>Play forecast</button>
          </>
        )}
      </div>
      <input
        className="timeline-slider"
        type="range"
        min={range.min}
        max={range.max}
        value={Math.min(selectedIndex, range.max)}
        disabled={range.disabled}
        aria-label="Selected smoke frame"
        onChange={(event) => onSelectedIndexChange(event.currentTarget.valueAsNumber)}
      />
      <div className="timeline-frame-status" aria-label="Frame load status">
        {frames.map((timelineFrame) => (
          <span
            key={timelineFrame.id}
            className={frameLoadStates[timelineFrame.id] ?? "idle"}
            title={`${timelineFrame.label}: ${frameLoadStates[timelineFrame.id] ?? "waiting"}`}
          />
        ))}
      </div>
      <div className="timeline-marks" aria-hidden="true">
        {marks.map((mark) => (
          <span key={mark.index} style={{ left: `${(mark.index / Math.max(frames.length - 1, 1)) * 100}%` }}>
            {mark.label}
          </span>
        ))}
      </div>
    </section>
  );
}
