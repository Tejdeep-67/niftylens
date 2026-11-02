import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { STOCKS } from "../../shared/symbols.js";
import { nestedTreemap } from "../lib/treemap.js";
import { pct } from "../lib/format.js";

// colour for a % change: red below zero, green above, saturates at +-3%
const STOPS = [
  [-3, [176, 34, 52]],
  [-1, [110, 36, 46]],
  [0, [33, 39, 50]],
  [1, [22, 92, 64]],
  [3, [16, 150, 94]],
];
export function heatColor(p) {
  const v = Math.max(-3, Math.min(3, p || 0));
  for (let i = 1; i < STOPS.length; i++) {
    const [x1, c1] = STOPS[i];
    const [x0, c0] = STOPS[i - 1];
    if (v <= x1) {
      const t = (v - x0) / (x1 - x0);
      const c = c0.map((a, k) => Math.round(a + (c1[k] - a) * t));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(16,150,94)";
}

export default function Heatmap({ quotes, sizeBy = "value" }) {
  const box = useRef();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const nav = useNavigate();

  useEffect(() => {
    const el = box.current;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (!size.w) return [];
    const groups = {};
    for (const s of STOCKS) {
      const q = quotes[s.symbol];
      if (!q) continue;
      // traded value today = price x volume (falls back to 1 if volume is missing)
      const value = sizeBy === "equal" ? 1 : Math.max(q.price * (q.volume || 0), 1);
      (groups[s.sector] ||= []).push({ ...s, q, value });
    }
    const list = Object.entries(groups).map(([name, children]) => ({ name, children }));
    return nestedTreemap(list, size.w, size.h, 1, 16);
  }, [quotes, size, sizeBy]);

  return (
    <div className="heatmap" ref={box} role="group" aria-label="NIFTY 50 heatmap by sector">
      {layout.map((sec) => (
        <div key={sec.name}>
          <div className="hm-sector-label" style={{ left: sec.x + 5, top: sec.y + 1, maxWidth: sec.w - 8 }}>
            {sec.w > 50 ? sec.name : ""}
          </div>
          {sec.children.map((c) => {
            // only draw the label if it fits (roughly 7.5px per character at 12px)
            const big = c.w > Math.max(64, c.symbol.length * 8.2 + 8) && c.h > 38;
            const fitsSmall = c.w > c.symbol.length * 6.6 + 6 && c.h > 18;
            const tiny = !big && !fitsSmall;
            return (
              <button
                key={c.symbol}
                className="hm-tile"
                style={{ left: c.x, top: c.y, width: c.w, height: c.h, background: heatColor(c.q.changePct) }}
                onClick={() => nav(`/stock/${encodeURIComponent(c.symbol)}`)}
                title={`${c.short}: ${pct(c.q.changePct)}`}
                aria-label={`${c.short} ${pct(c.q.changePct)}`}
              >
                {!tiny && <span className="t-sym" style={{ fontSize: big ? 13 : 10.5 }}>{c.symbol}</span>}
                {big && <span className="t-chg">{pct(c.q.changePct)}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function HeatLegend() {
  return (
    <div className="hm-legend" aria-hidden="true">
      {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
        <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span className="sw" style={{ background: heatColor(v) }} />
          {v > 0 ? "+" : ""}{v}%
        </span>
      ))}
    </div>
  );
}
