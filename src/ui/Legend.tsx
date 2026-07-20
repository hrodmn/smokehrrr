import { SMOKE_RENDERING, type SmokeColorStep } from "../hrrr/metadata";

export function colorRampBackground(
  colormap: readonly SmokeColorStep[] = SMOKE_RENDERING.colormap,
): string {
  const stops = colormap.map(([, [red, green, blue, alpha]], index) => {
    const pct = Math.round((index / Math.max(colormap.length - 1, 1)) * 100);
    return `rgba(${red}, ${green}, ${blue}, ${alpha / 255}) ${pct}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

export function Legend() {
  return (
    <section className="panel legend" aria-label="Smoke legend">
      <p className="eyebrow">{SMOKE_RENDERING.label}</p>
      <div
        className="legend-ramp"
        style={{ background: colorRampBackground(SMOKE_RENDERING.colormap) }}
      />
      <div className="legend-labels">
        <span>
          {SMOKE_RENDERING.legendRange[0]} {SMOKE_RENDERING.units}
        </span>
        <span>
          {SMOKE_RENDERING.legendRange[1]}+ {SMOKE_RENDERING.units}
        </span>
      </div>
    </section>
  );
}
