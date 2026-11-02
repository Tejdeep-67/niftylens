import { useId } from "react";

// small SVG line/area chart. points = [[t, value], ...] or [value, ...]
export default function Sparkline({ points, width = 120, height = 36, base, tone = "flat", area = true, strokeWidth = 1.6, className = "" }) {
  const id = useId().replace(/:/g, "");
  if (!points || points.length < 2) return <div className={className} style={{ height }} aria-hidden="true" />;
  const vals = points.map((p) => (Array.isArray(p) ? p[1] : p));
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (base != null) {
    min = Math.min(min, base);
    max = Math.max(max, base);
  }
  const span = max - min || 1;
  const x = (i) => (i / (vals.length - 1)) * width;
  const y = (v) => height - 2 - ((v - min) / span) * (height - 4);
  const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const color = tone === "up" ? "var(--up)" : tone === "down" ? "var(--down)" : "var(--accent)";
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
      <defs>
        <linearGradient id={"g" + id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {base != null && <line x1="0" x2={width} y1={y(base)} y2={y(base)} stroke="rgba(148,163,184,.35)" strokeDasharray="2 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      {area && <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#g${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
