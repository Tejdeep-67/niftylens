// semicircle gauge from -1 (bearish) to +1 (bullish)
export default function Gauge({ score = 0, size = 220, label, sub }) {
  const s = Math.max(-1, Math.min(1, score || 0));
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const angle = Math.PI * (1 - (s + 1) / 2); // 180deg (left) .. 0deg (right)
  const nx = cx + Math.cos(angle) * (r - 10);
  const ny = cy - Math.sin(angle) * (r - 10);
  const arc = (a0, a1) => {
    const p0 = [cx + Math.cos(a0) * r, cy - Math.sin(a0) * r];
    const p1 = [cx + Math.cos(a1) * r, cy - Math.sin(a1) * r];
    return `M${p0[0]},${p0[1]} A${r},${r} 0 0 1 ${p1[0]},${p1[1]}`;
  };
  const segs = [
    [Math.PI, Math.PI * 0.8, "#ff5f6d"],
    [Math.PI * 0.8, Math.PI * 0.6, "#ff9a7a"],
    [Math.PI * 0.6, Math.PI * 0.4, "#6b7588"],
    [Math.PI * 0.4, Math.PI * 0.2, "#7fdcae"],
    [Math.PI * 0.2, 0, "#2fd08c"],
  ];
  return (
    <div className="gauge-wrap" role="img" aria-label={`Sentiment ${label || ""}, score ${s.toFixed(2)} on a scale of -1 to 1`}>
      <svg width="100%" viewBox={`0 0 ${size} ${size / 2 + 18}`} style={{ maxWidth: size }}>
        {segs.map(([a0, a1, c], i) => (
          <path key={i} d={arc(a0 - 0.015, a1 + 0.015)} stroke={c} strokeWidth="10" fill="none" strokeLinecap="butt" opacity="0.9" />
        ))}
        <g style={{ transition: "transform .9s cubic-bezier(.22,1,.36,1)" }}>
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#e6ebf2" strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill="#e6ebf2" />
        </g>
        <text x="14" y={cy + 16} fill="#657084" fontSize="10">-1</text>
        <text x={size - 22} y={cy + 16} fill="#657084" fontSize="10">+1</text>
      </svg>
      {label && <div className="gauge-label">{label}</div>}
      {sub && <div className="gauge-sub">{sub}</div>}
    </div>
  );
}
