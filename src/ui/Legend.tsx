export function Legend() {
  return (
    <section className="panel legend" aria-label="Smoke legend">
      <p className="eyebrow">Smoke mass density</p>
      <div className="legend-ramp" />
      <div className="legend-labels">
        <span>lower</span>
        <span>higher</span>
      </div>
      <p className="legend-note">Fixed MVP range; values outside the range are clipped.</p>
    </section>
  );
}
