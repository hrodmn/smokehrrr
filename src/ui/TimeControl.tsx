import { useEffect, useRef, useState } from "react";
import { SMOKE_RENDERING } from "../hrrr/metadata";
import { formatViewerShortHour, type SmokeFrame } from "../hrrr/time";

export type PlaybackRange = "analysis" | "forecast";
export type SmokeFrameLoadState = "loading" | "loaded" | "error";

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

export function frameIndexes(frames: SmokeFrame[], kind: PlaybackRange, frameLoadStates: Record<string, SmokeFrameLoadState> = {}): number[] {
  return frames.flatMap((frame, index) => (frame.kind === kind && frameLoadStates[frame.id] !== "error" ? [index] : []));
}

export function timelineMarks(frames: SmokeFrame[]): { index: number; label: string }[] {
  if (frames.length === 0) return [];
  const latestAnalysis = latestAnalysisFrameIndex(frames);
  return [0, latestAnalysis, frames.length - 1]
    .filter((index, position, indexes) => index >= 0 && indexes.indexOf(index) === position)
    .map((index) => {
      if (index === latestAnalysis) return { index, label: "Now" };
      const frame = frames[index];
      if (!frame) return { index, label: "" };
      return { index, label: frame.kind === "forecast" ? `+${frame.forecastHour}h` : formatViewerShortHour(frame.validTime) };
    });
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

export function nearestFrameIndex(value: number, max: number): number {
  return Math.min(Math.max(Math.round(value), 0), max);
}

export function nearestLoadedFrameIndex(value: number, frames: SmokeFrame[], frameLoadStates: Record<string, SmokeFrameLoadState>): number {
  const index = nearestFrameIndex(value, Math.max(frames.length - 1, 0));
  if (frameLoadStates[frames[index]?.id] === "loaded") return index;

  for (let distance = 1; distance < frames.length; distance += 1) {
    const before = index - distance;
    const after = index + distance;
    if (frameLoadStates[frames[before]?.id] === "loaded") return before;
    if (frameLoadStates[frames[after]?.id] === "loaded") return after;
  }
  return index;
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
  const [minimized, setMinimized] = useState(false);
  const [sliderValue, setSliderValue] = useState(selectedIndex);
  const scrubbing = useRef(false);
  const commitFrame = useRef<number | null>(null);
  const range = timeControlRange(frames);
  const displayIndex = nearestLoadedFrameIndex(sliderValue, frames, frameLoadStates);
  const frame = frames[displayIndex];
  const latestAnalysisIndex = latestAnalysisFrameIndex(frames);
  const marks = timelineMarks(frames);
  const timestamp = frame ? formatViewerShortHour(frame.validTime) : "Waiting for HRRR smoke frames";

  useEffect(() => {
    if (!scrubbing.current) setSliderValue(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    return () => {
      if (commitFrame.current !== null) window.cancelAnimationFrame(commitFrame.current);
    };
  }, []);

  const scrubTo = (value: number) => {
    setSliderValue(value);
    const index = nearestLoadedFrameIndex(value, frames, frameLoadStates);
    if (index === selectedIndex) return;
    if (commitFrame.current !== null) window.cancelAnimationFrame(commitFrame.current);
    commitFrame.current = window.requestAnimationFrame(() => {
      onSelectedIndexChange(index);
      commitFrame.current = null;
    });
  };

  return (
    <section className={`panel time-control${minimized ? " minimized" : ""}`} aria-label="Smoke time control">
      <div className="time-control-header">
        <div className="selected-frame">
          <span className={`badge ${frame?.kind ?? "analysis"}`}>{frame ? frameBadge(frame) : "No frames"}</span>
          <strong>{timestamp}</strong>
          {minimized ? null : <span>{SMOKE_RENDERING.legendNote}</span>}
        </div>
        <button
          type="button"
          className="minimize-toggle"
          aria-expanded={!minimized}
          aria-label={minimized ? "Show full time controls" : "Minimize time controls"}
          title={minimized ? "Show full time controls" : "Minimize time controls"}
          onClick={() => setMinimized(!minimized)}
        >
          {minimized ? "⌃" : "⌄"}
        </button>
        {minimized ? null : (
          <>
            {frames.length > 0 ? <span className="load-summary">{frameLoadSummary(frames, frameLoadStates)}</span> : null}
          </>
        )}
      </div>
      {minimized ? null : (
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
      )}
      <input
        className="timeline-slider"
        type="range"
        min={range.min}
        max={range.max}
        step={0.01}
        value={Math.min(sliderValue, range.max)}
        disabled={range.disabled}
        aria-label="Selected smoke frame"
        onPointerDown={() => {
          scrubbing.current = true;
        }}
        onPointerUp={(event) => {
          scrubbing.current = false;
          scrubTo(nearestLoadedFrameIndex(event.currentTarget.valueAsNumber, frames, frameLoadStates));
        }}
        onChange={(event) => scrubTo(event.currentTarget.valueAsNumber)}
        onBlur={(event) => {
          scrubbing.current = false;
          scrubTo(nearestLoadedFrameIndex(event.currentTarget.valueAsNumber, frames, frameLoadStates));
        }}
      />
      {minimized ? null : (
        <>
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
        </>
      )}
    </section>
  );
}
