import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarket } from "../state/MarketData.jsx";
import { MoodPanel } from "./Overview.jsx";
import NewsList from "../components/NewsList.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { useNewsSummaries } from "../lib/useNewsSummaries.js";
import { timeAgo } from "../lib/format.js";

export default function News() {
  const { marketNews, watchlist } = useMarket();
  const [filter, setFilter] = useState("all");
  const summaries = useNewsSummaries(watchlist.slice(0, 8));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>News &amp; sentiment</h1>
          <p>Market headlines from ET Markets, Mint and Business Standard, each labelled by my sentiment model.</p>
        </div>
        <Link to="/model" className="btn small">How the model works</Link>
      </div>
      {marketNews && marketNews.mode === "sample" && (
        <div className="banner" role="status">Live news isn't reachable from here, so these are recorded sample headlines.</div>
      )}
      <div className="grid stock-grid">
        <div className="panel reveal">
          <div className="panel-head">
            <h2>Market headlines</h2>
            <div className="seg" role="group" aria-label="Filter by label">
              {["all", "positive", "neutral", "negative"].map((f) => (
                <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
          </div>
          {!marketNews ? <Skeleton h={500} /> : marketNews.error ? <p className="empty">Couldn't load news ({marketNews.error}).</p> : <NewsList items={marketNews.items} filter={filter} />}
          {marketNews && marketNews.fetchedAt && <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>Fetched {timeAgo(marketNews.fetchedAt)} · refreshes every 10 min</p>}
        </div>
        <div className="side-stack">
          <MoodPanel news={marketNews} />
          <div className="panel reveal">
            <div className="panel-head"><h2>Your watchlist</h2><span className="sub">7-day mood</span></div>
            <ul className="row-list">
              {watchlist.slice(0, 8).map((s) => {
                const m = summaries[s];
                const t = m ? (m.score >= 0.08 ? "up" : m.score <= -0.08 ? "down" : "flat") : "flat";
                return (
                  <li key={s}>
                    <Link to={`/stock/${encodeURIComponent(s)}`}>
                      <div><div className="sym">{s}</div><div className="nm">{m ? `${m.mood} · ${m.n} headlines` : m === null ? "no data" : "loading…"}</div></div>
                      <span />
                      <span className={`chip ${t}`}>{m ? (m.score > 0 ? "+" : "") + m.score.toFixed(2) : "--"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
