interface Point {
  date: Date;
  cumulative: number;
}

const WIDTH = 600;
const HEIGHT = 160;
const PAD_X = 8;
const PAD_Y = 16;

// Single-series cumulative-units sparkline. No legend needed (one series);
// the end label carries the sign so color never has to speak alone.
export default function UnitsChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-neutral-500">Not enough graded picks yet for a chart.</p>;
  }

  const values = points.map((p) => p.cumulative);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  const x = (i: number) => PAD_X + (i / (points.length - 1)) * (WIDTH - PAD_X * 2);
  const y = (v: number) => HEIGHT - PAD_Y - ((v - min) / range) * (HEIGHT - PAD_Y * 2);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  const final = points[points.length - 1].cumulative;
  const lineColor = "#3987e5"; // sequential blue — single series, identity via label not hue
  const endColor = final >= 0 ? "#0ca30c" : "#e66767";

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Cumulative units over the last 90 days">
      <line
        x1={PAD_X}
        y1={zeroY}
        x2={WIDTH - PAD_X}
        y2={zeroY}
        stroke="#383835"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <path d={path} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(final)} r={3} fill={endColor} />
      <text
        x={WIDTH - PAD_X}
        y={y(final) - 8}
        textAnchor="end"
        fontSize="12"
        fill={endColor}
        className="[font-variant-numeric:tabular-nums]"
      >
        {final >= 0 ? "+" : ""}
        {final.toFixed(2)}u
      </text>
      <text x={PAD_X} y={HEIGHT - 2} fontSize="10" fill="#898781">
        {points[0].date.toLocaleDateString()}
      </text>
      <text x={WIDTH - PAD_X} y={HEIGHT - 2} textAnchor="end" fontSize="10" fill="#898781">
        {points[points.length - 1].date.toLocaleDateString()}
      </text>
    </svg>
  );
}
