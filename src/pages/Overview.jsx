import { useState } from "react";
import { Link } from "react-router-dom";
import { INDICES } from "../../shared/symbols.js";
import { useMarket } from "../state/MarketData.jsx";
import { DataNote } from "../components/Layout.jsx";
import Sparkline from "../components/Sparkline.jsx";
import Price from "../components/Price.jsx";
import Gauge from "../components/Gauge.jsx";
import Heatmap, { HeatLegend } from "../components/Heatmap.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { marketStats } from "../lib/marketStats.js";
import { pct, signed, tone, price, compact } from "../lib/format.js";

function IndexCard({ idx, q, flash, delay }) {
  if (!q)
    return (
      <div className="panel">
        <Skeleton h={12} w={90} />
        <Skeleton h={30} w={160} style={{ marginTop: 10 }} />
        <Skeleton h={54} style={{ marginTop: 14 }} />
      </div>
    );
  const t = tone(q.changePct);
  const pos = q.high && q.low && q.high > q.low ? ((q.price - q.low) / (q.high - q.low)) * 100 : 50;
  return (
    <Link to={`/stock/${idx.symbol}`} className="panel index-card reveal" style={{ animationDelay: delay + "ms" }}>
      <div className="name">{idx.name}</div>
      <div className="value">
        <Price value={q.price} flash={flash} />
      </div>
      <div className={`chg num ${t}`}>
        {signed(q.change)} ({pct(q.changePct)})
      </div>
      <Sparkline points={q.spark} base={q.prevClose} tone={t} height={54} className="spark" />
      {q.high != null && (
        <div className="range-bar">
          <div className="range-track">
            <div className="range-fill" style={{ left: `${Math.max(0, Math.min(100, pos))}%` }} />
          </div>
          <div className="range-labels num">
            <span>L {price(q.low)}</span>
            <span>Day range</span>
            <span>H {price(q.high)}</span>
          </div>
        </div>
      )}
    </Link>
  );
}

function MoverList({ title, rows, kind }) {
  return (
    <div className="panel reveal">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      <ul className="row-list">
        {rows.map((r) => (
          <li key={r.symbol}>
            <Link to={`/stock/${encodeURIComponent(r.symbol)}`}>
              <div style={{ minWidth: 0 }}>
                <div className="sym">{r.symbol}</div>
                <div className="nm">{r.short}</div>
              </div>
              <span className="num">{kind === "value" ? "₹" + compact(r.q.price * (r.q.volume || 0)) : price(r.q.price)}</span>
              <span className={`chip ${tone(r.q.changePct)}`}>{pct(r.q.changePct)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MoodPanel({ news }) {
  if (!news) {
    return (
      <div className="panel">
        <div className="panel-head"><h2>Market mood</h2></div>
        <Skeleton h={120} />
      </div>
    );
  }
  const s = news.summary;
  return (
    <div className="panel reveal">
      <div className="panel-head">
        <h2>Market mood</h2>
        <Link to="/news" className="sub">headlines →</Link>
      </div>
      {s ? (
        <>
          <Gauge score={s.score} label={s.mood} sub={`score ${signed(s.score)} from ${s.n} market headlines`} />
          <div className="mood-counts">
            <span className="chip up">{s.counts.positive} positive</span>
            <span className="chip flat">{s.counts.neutral} neutral</span>
            <span className="chip down">{s.counts.negative} negative</span>
          </div>
        </>
      ) : (
        <p className="muted">News couldn't be loaded right now.</p>
      )}
    </div>
  );
}

export function BreadthPanel({ stats }) {
  const total = stats.count || 1;
  return (
    <div className="panel reveal">
      <div className="panel-head">
        <h2>Breadth</h2>
        <span className="sub">NIFTY 50 stocks</span>
      </div>
      <div className="breadth-bar" role="img" aria-label={`${stats.adv} advancing, ${stats.dec} declining, ${stats.unch} unchanged`}>
        <div style={{ width: (stats.adv / total) * 100 + "%", background: "var(--up)" }} />
        <div style={{ width: (stats.unch / total) * 100 + "%", background: "#4b5565" }} />
        <div style={{ width: (stats.dec / total) * 100 + "%", background: "var(--down)" }} />
      </div>
      <div className="breadth-legend num">
        <span className="up">▲ {stats.adv} up</span>
        <span className="muted">{stats.unch} flat</span>
        <span className="down">▼ {stats.dec} down</span>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
        Advance/decline ratio <b className="num" style={{ color: "var(--text)" }}>{stats.ratio.toFixed(2)}</b>
        {stats.ratio > 1.5 ? " · broad buying" : stats.ratio < 0.67 ? " · broad selling" : " · mixed"}
      </p>
    </div>
  );
}

export function SectorPanel({ stats }) {
  const max = Math.max(1, ...stats.sectors.map((s) => Math.abs(s.avg)));
  return (
    <div className="panel reveal">
      <div className="panel-head">
        <h2>Sectors today</h2>
        <span className="sub">avg % change</span>
      </div>
      {stats.sectors.map((s) => {
        const w = (Math.abs(s.avg) / max) * 50;
        return (
          <div className="sector-row" key={s.name}>
            <span className="muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
            <div className="bar-wrap">
              <div className="bar" style={{ width: w + "%", left: s.avg >= 0 ? "50%" : 50 - w + "%", background: s.avg >= 0 ? "var(--up)" : "var(--down)" }} />
            </div>
            <span className={`num ${tone(s.avg)}`} style={{ textAlign: "right" }}>{pct(s.avg)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Overview() {
  const { quotes, changes, marketNews, meta } = useMarket();
  const [sizeBy, setSizeBy] = useState("value");
  const stats = marketStats(quotes);
  const ready = stats.count > 0;

  return (
    <>
      <DataNote />
      <div className="page-head">
        <div>
          <h1>Market overview</h1>
          <p>NIFTY 50, BANK NIFTY and SENSEX with live-ish prices, breadth and the mood of today's headlines.</p>
        </div>
      </div>

      <div className="grid index-grid">
        {INDICES.map((idx, i) => (
          <IndexCard key={idx.symbol} idx={idx} q={quotes[idx.symbol]} flash={changes[idx.symbol]} delay={i * 60} />
        ))}
      </div>

      <div className="grid overview-main" style={{ marginTop: 16 }}>
        <div className="panel reveal">
          <div className="panel-head">
            <h2>Heatmap</h2>
            <div className="seg" role="group" aria-label="Tile size">
              <button aria-pressed={sizeBy === "value"} onClick={() => setSizeBy("value")}>Size: traded value</button>
              <button aria-pressed={sizeBy === "equal"} onClick={() => setSizeBy("equal")}>Equal</button>
            </div>
          </div>
          {ready ? <Heatmap quotes={quotes} sizeBy={sizeBy} /> : <Skeleton h={470} />}
          <HeatLegend />
        </div>
        <div className="side-stack">
          <MoodPanel news={marketNews} />
          {ready ? <BreadthPanel stats={stats} /> : <div className="panel"><Skeleton h={90} /></div>}
        </div>
      </div>

      {ready ? (
        <>
          <div className="grid movers" style={{ marginTop: 16 }}>
            <MoverList title="Top gainers" rows={stats.gainers} />
            <MoverList title="Top losers" rows={stats.losers} />
            <MoverList title="Most traded (₹ value)" rows={stats.active} kind="value" />
          </div>
          <div style={{ marginTop: 16 }}>
            <SectorPanel stats={stats} />
          </div>
        </>
      ) : (
        !meta.failed && (
          <div className="grid movers" style={{ marginTop: 16 }}>
            {[0, 1, 2].map((i) => (
              <div className="panel" key={i}><Skeleton h={200} /></div>
            ))}
          </div>
        )
      )}
    </>
  );
}
