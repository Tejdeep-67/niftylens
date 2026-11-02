import { useEffect, useState } from "react";
import { useMarket } from "../state/MarketData.jsx";
import { BreadthPanel, SectorPanel } from "./Overview.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { marketStats } from "../lib/marketStats.js";
import { pct } from "../lib/format.js";

function Scatter({ points, yIndex = 1, label }) {
  const W = 560, H = 300, P = 36;
  const ys = points.map((p) => p[yIndex]);
  const lim = Math.min(8, Math.max(2, ...ys.map(Math.abs)));
  const x = (v) => P + ((v + 1) / 2) * (W - P * 1.5);
  const y = (v) => H / 2 - (Math.max(-lim, Math.min(lim, v)) / lim) * (H / 2 - 20);
  // least squares line
  const n = points.length;
  const mx = points.reduce((a, p) => a + p[0], 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  points.forEach((p, i) => { sxy += (p[0] - mx) * (ys[i] - my); sxx += (p[0] - mx) ** 2; });
  const b = sxx ? sxy / sxx : 0;
  const a = my - b * mx;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
      <line x1={P} x2={W - P / 2} y1={H / 2} y2={H / 2} stroke="rgba(148,163,184,.25)" />
      <line x1={x(0)} x2={x(0)} y1={10} y2={H - 10} stroke="rgba(148,163,184,.25)" />
      {points.map((p, i) => (
        <circle key={i} cx={x(p[0])} cy={y(p[yIndex])} r="2.6" fill={p[yIndex] >= 0 ? "rgba(47,208,140,.55)" : "rgba(255,95,109,.55)"} />
      ))}
      <line x1={x(-1)} y1={y(a - b)} x2={x(1)} y2={y(a + b)} stroke="#7aa2ff" strokeWidth="2" />
      <text x={P} y={H - 4} fill="#657084" fontSize="11">−1 (negative news)</text>
      <text x={W - 140} y={H - 4} fill="#657084" fontSize="11">+1 (positive news)</text>
      <text x={4} y={16} fill="#657084" fontSize="11">+{lim}%</text>
      <text x={4} y={H - 18} fill="#657084" fontSize="11">−{lim}%</text>
    </svg>
  );
}

function Buckets({ buckets, field, title }) {
  const keys = ["negative", "neutral", "positive"].filter((k) => buckets[k]);
  const max = Math.max(0.2, ...keys.map((k) => Math.abs(buckets[k][field]) + (field === "avg_next_excess" ? buckets[k].se_next_excess : 0)));
  return (
    <div>
      <div className="dim" style={{ fontSize: 12.5, marginBottom: 8 }}>{title}</div>
      {keys.map((k) => {
        const v = buckets[k][field];
        const w = (Math.abs(v) / max) * 50;
        return (
          <div className="sector-row" key={k}>
            <span className="muted">{k} <span className="dim num">({buckets[k].n})</span></span>
            <div className="bar-wrap">
              <div className="bar" style={{ width: w + "%", left: v >= 0 ? "50%" : 50 - w + "%", background: v >= 0 ? "var(--up)" : "var(--down)" }} />
            </div>
            <span className={`num ${v >= 0 ? "up" : "down"}`} style={{ textAlign: "right" }}>{pct(v, 2)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Insights() {
  const { quotes } = useMarket();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/data/insights.json").then((r) => r.json()).then(setData).catch((e) => setErr(e.message));
  }, []);
  const stats = marketStats(quotes);
  const c = data && data.correlations;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Insights</h1>
          <p>Today's breadth and sectors, plus a test of whether news sentiment predicts the next day's return.</p>
        </div>
      </div>

      {stats.count > 0 ? (
        <div className="grid two-col">
          <BreadthPanel stats={stats} />
          <div className="panel reveal">
            <div className="panel-head"><h2>Today in one line</h2></div>
            <p className="prose" style={{ fontSize: 15 }}>
              {stats.adv} of {stats.count} NIFTY 50 stocks are up. Best sector: <b className="up">{stats.sectors[0].name} {pct(stats.sectors[0].avg)}</b>,
              worst: <b className="down">{stats.sectors[stats.sectors.length - 1].name} {pct(stats.sectors[stats.sectors.length - 1].avg)}</b>.
              Biggest gainer {stats.gainers[0].symbol} ({pct(stats.gainers[0].q.changePct)}), biggest loser {stats.losers[0].symbol} ({pct(stats.losers[0].q.changePct)}).
            </p>
          </div>
        </div>
      ) : (
        <Skeleton h={140} />
      )}
      {stats.count > 0 && <div style={{ marginTop: 16 }}><SectorPanel stats={stats} /></div>}

      <h2 style={{ fontSize: 20, margin: "34px 0 6px" }}>Does sentiment lead returns?</h2>
      <p className="muted" style={{ fontSize: 14, maxWidth: 820 }}>
        {data
          ? `I collected ${data.headlines.toLocaleString("en-IN")} headlines about NIFTY 50 stocks from Google News (${data.period[0]} to ${data.period[1]}), scored them with the model, and matched them with daily closes. ${data.stock_days.toLocaleString("en-IN")} stock-days had at least ${data.min_headlines} headlines.`
          : "Loading the analysis…"}
      </p>
      {err && <p className="down">Couldn't load the analysis ({err}).</p>}
      {data && (
        <>
          <div className="kpis" style={{ marginTop: 16 }}>
            <div className="panel kpi reveal"><div className="k">Same-day correlation</div><div className="v num">{c.same_ex.pearson.toFixed(2)}</div><div className="dim" style={{ fontSize: 12 }}>p {c.same_ex.pearson_p < 0.001 ? "< 0.001" : c.same_ex.pearson_p}</div></div>
            <div className="panel kpi reveal"><div className="k">Next-day correlation</div><div className="v num">{c.next_ex.pearson.toFixed(3)}</div><div className="dim" style={{ fontSize: 12 }}>p = {c.next_ex.pearson_p}</div></div>
            <div className="panel kpi reveal"><div className="k">Direction hit rate</div><div className="v num">{(data.direction.hit_rate * 100).toFixed(1)}%</div><div className="dim" style={{ fontSize: 12 }}>{data.direction.n} days with clear sentiment</div></div>
            <div className="panel kpi reveal"><div className="k">Spearman (next day)</div><div className="v num">{c.next_ex.spearman.toFixed(3)}</div><div className="dim" style={{ fontSize: 12 }}>rank correlation</div></div>
          </div>
          <div className="grid two-col" style={{ marginTop: 16 }}>
            <div className="panel reveal">
              <div className="panel-head"><h2>Sentiment vs next-day return</h2><span className="sub">excess over NIFTY, 400-point sample</span></div>
              <Scatter points={data.scatter} yIndex={1} label="Scatter of daily sentiment against next-day excess return" />
              <p className="dim" style={{ fontSize: 12 }}>Each dot is one stock on one day. Blue line = least-squares fit on the plotted sample; flat means no relationship.</p>
            </div>
            <div className="panel reveal">
              <div className="panel-head"><h2>Average excess return by mood</h2></div>
              <Buckets buckets={data.buckets} field="avg_same_excess" title="Same day (news published before that day's close)" />
              <div style={{ height: 18 }} />
              <Buckets buckets={data.buckets} field="avg_next_excess" title="Next day" />
              <p className="dim" style={{ fontSize: 12, marginTop: 10 }}>Buckets: score ≤ −0.15 negative, ≥ +0.15 positive. Excess = stock return − NIFTY 50 return.</p>
            </div>
          </div>
          <div className="panel reveal prose" style={{ marginTop: 16 }}>
            <div className="panel-head"><h2>What I take from this</h2></div>
            <p>
              <strong>Sentiment clearly tracks the same day's move</strong> (r ≈ {c.same_ex.pearson.toFixed(2)}): on days with negative headlines the stock did
              {" "}{pct(data.buckets.negative.avg_same_excess)} vs the index on average, on positive days {pct(data.buckets.positive.avg_same_excess)}.
              A lot of headlines are literally reports of the move ("shares jump 5%").
            </p>
            <p>
              <strong>It does not predict the next day</strong> in this sample: the correlation is {c.next_ex.pearson.toFixed(3)} (p = {c.next_ex.pearson_p}) and the direction
              hit rate is {(data.direction.hit_rate * 100).toFixed(1)}%, which is no better than a coin flip. That fits the idea that large-cap prices adjust to public news within the day.
            </p>
            <p>
              Caveats: only ~4 months of data, Google News returns a sample of articles (max ~100 per query) and its timestamps can be late, and the model has its own errors.
              Intraday data around each headline would be the proper next step.
            </p>
          </div>
        </>
      )}
    </>
  );
}
