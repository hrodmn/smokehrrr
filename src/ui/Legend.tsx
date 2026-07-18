import { SMOKE_RENDERINGS, type SmokeColorStep, type SmokeRenderingId } from "../hrrr/metadata";

export function colorRampBackground(colormap: readonly SmokeColorStep[] = SMOKE_RENDERINGS.density.colormap): string {
  const stops = colormap.map(([, [red, green, blue, alpha]], index) => {
    const pct = Math.round((index / Math.max(colormap.length - 1, 1)) * 100);
    return `rgba(${red}, ${green}, ${blue}, ${alpha / 255}) ${pct}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

export function Legend({ rendering }: { rendering: SmokeRenderingId }) {
  const layer = SMOKE_RENDERINGS[rendering];

  return (
    <section className="panel legend" aria-label="Smoke legend">
      <p className="eyebrow">{layer.label}</p>
      <div className="legend-ramp" style={{ background: colorRampBackground(layer.colormap) }} />
      <div className="legend-labels">
        <span>{layer.legendRange[0]} {layer.units}</span>
        <span>{layer.legendRange[1]}+ {layer.units}</span>
      </div>
      <p className="legend-note">{layer.legendNote}</p>
    </section>
  );
}
