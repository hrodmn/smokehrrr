import { useState } from "react";
import { SMOKE_RENDERING } from "../hrrr/metadata";
import { sampleSmokeFrameValue, type SmokeFrameArray } from "../hrrr/smoke-array-layer";
import { formatViewerShortHour, type SmokeFrame } from "../hrrr/time";

export type TimeSeriesPoint = {
  longitude: number;
  latitude: number;
};

export type TimeSeriesDatum = {
  frame: SmokeFrame;
  value: number | null;
};

type ChartPoint = TimeSeriesDatum & { x: number; y: number; value: number };

const chart = { left: 36, top: 8, width: 254, height: 106, bottom: 24 };

export function smokeTimeSeries(frames: SmokeFrame[], arrays: Record<string, SmokeFrameArray>, point: TimeSeriesPoint): TimeSeriesDatum[] {
  return frames.map((frame) => ({ frame, value: arrays[frame.id] ? sampleSmokeFrameValue(arrays[frame.id], point.longitude, point.latitude) : null }));
}

export function chartPoints(series: TimeSeriesDatum[]): { max: number; points: ChartPoint[] } {
  const values = series.flatMap((datum) => (datum.value === null ? [] : [datum.value]));
  const max = Math.max(...values, 1);
  const points = series.flatMap((datum, index) => {
    if (datum.value === null) return [];
    const x = chart.left + (series.length === 1 ? chart.width / 2 : (index / (series.length - 1)) * chart.width);
    const y = chart.top + chart.height - (datum.value / max) * chart.height;
    return [{ ...datum, value: datum.value, x, y }];
  });
  return { max, points };
}

function pathFor(points: ChartPoint[], kind: SmokeFrame["kind"]): string {
  return points
    .filter((point) => point.frame.kind === kind)
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
}

function tickLabel(value: number): string {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1);
}

function hoverLabel(point: ChartPoint): string {
  return `${point.value.toFixed(1)} ${SMOKE_RENDERING.units} · ${point.frame.kind} · ${formatViewerShortHour(point.frame.validTime)}`;
}

export function TimeSeriesPanel({
  frames,
  arrays,
  point,
  onClose,
}: {
  frames: SmokeFrame[];
  arrays: Record<string, SmokeFrameArray>;
  point: TimeSeriesPoint;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState<ChartPoint | null>(null);
  const series = smokeTimeSeries(frames, arrays, point);
  const { max, points } = chartPoints(series);
  const latest = [...points].reverse()[0];
  const first = frames[0];
  const last = frames.at(-1);
  const yTicks = [max, max / 2, 0];

  return (
    <aside className="panel time-series" aria-label="Smoke time series at selected location">
      <div className="time-series-header">
        <div>
          <p className="eyebrow">Map sample</p>
          <h2>{hovered ? `${hovered.value.toFixed(1)} ${SMOKE_RENDERING.units}` : latest ? `${latest.value.toFixed(1)} ${SMOKE_RENDERING.units}` : "Loading values…"}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close time series">×</button>
      </div>
      <p className="time-series-location">{point.latitude.toFixed(2)}°, {point.longitude.toFixed(2)}°</p>
      <svg className="time-series-chart" viewBox="0 0 310 146" role="img" aria-label={`${SMOKE_RENDERING.shortLabel} over time`}>
        {yTicks.map((tick) => {
          const y = chart.top + chart.height - (tick / max) * chart.height;
          return (
            <g key={tick} className="time-series-tick">
              <line x1={chart.left} x2={chart.left + chart.width} y1={y} y2={y} />
              <text x={chart.left - 8} y={y + 4}>{tickLabel(tick)}</text>
            </g>
          );
        })}
        <path className="analysis-line" d={pathFor(points, "analysis")} />
        <path className="forecast-line" d={pathFor(points, "forecast")} />
        {points.map((datum) => (
          <circle
            key={datum.frame.id}
            className={`time-series-hit ${datum.frame.kind}`}
            cx={datum.x}
            cy={datum.y}
            r="7"
            onMouseEnter={() => setHovered(datum)}
            onMouseLeave={() => setHovered(null)}
          >
            <title>{hoverLabel(datum)}</title>
          </circle>
        ))}
        {hovered ? (
          <g className="time-series-hover">
            <line x1={hovered.x} x2={hovered.x} y1={chart.top} y2={chart.top + chart.height} />
            <text x={Math.min(hovered.x + 8, 214)} y={Math.max(hovered.y - 8, 12)}>{hoverLabel(hovered)}</text>
          </g>
        ) : null}
        <g className="time-series-x-axis">
          {first ? <text x={chart.left} y="140">{formatViewerShortHour(first.validTime)}</text> : null}
          {last ? <text x={chart.left + chart.width} y="140">{formatViewerShortHour(last.validTime)}</text> : null}
        </g>
      </svg>
      <div className="time-series-meta">
        <span className="legend-swatch solid">Analysis</span>
        <span className="legend-swatch dashed">Forecast</span>
        <span>{points.length}/{frames.length} frames</span>
      </div>
    </aside>
  );
}
