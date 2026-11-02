import { Link } from "react-router-dom";
import { getStock } from "../../shared/symbols.js";
import { useMarket } from "../state/MarketData.jsx";
import { DataNote } from "../components/Layout.jsx";
import Search from "../components/Search.jsx";
import Price from "../components/Price.jsx";
import Sparkline from "../components/Sparkline.jsx";
import { IconTrash } from "../components/Icons.jsx";
import { useNewsSummaries } from "../lib/useNewsSummaries.js";
import { pct, signed, tone, compact } from "../lib/format.js";

function MoodChip({ s }) {
  if (s === undefined) return <span className="skel" style={{ display: "inline-block", width: 70, height: 20 }} />;
  if (!s) return <span className="dim">--</span>;
  const t = s.score >= 0.08 ? "up" : s.score <= -0.08 ? "down" : "flat";
  return (
    <span className={`chip ${t}`} title={`${s.n} headlines`}>
      {s.score > 0 ? "+" : ""}{s.score.toFixed(2)}
    </span>
  );
}

export default function Watchlist() {
  const { watchlist, setWatchlist, toggleWatch, quotes, changes } = useMarket();
  const summaries = useNewsSummaries(watchlist);

  return (
    <>
      <DataNote />
      <div className="page-head">
        <div>
          <h1>Watchlist</h1>
          <p>Saved on this device. Prices refresh on their own; sentiment is from the last 7 days of headlines.</p>
        </div>
        <Search stocksOnly placeholder="Add a stock…" onPick={(s) => !watchlist.includes(s) && setWatchlist([...watchlist, s])} />
      </div>
      <div className="panel reveal">
        {watchlist.length === 0 ? (
          <div className="empty">Your watchlist is empty. Search above to add stocks.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>LTP</th>
                  <th>Change</th>
                  <th style={{ width: 130 }}>Today</th>
                  <th>Volume</th>
                  <th>News mood</th>
                  <th><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((s) => {
                  const q = quotes[s];
                  const info = getStock(s);
                  return (
                    <tr key={s}>
                      <td className="td-sym">
                        <Link to={`/stock/${encodeURIComponent(s)}`}>{s}<span className="nm">{info ? info.short : ""}</span></Link>
                      </td>
                      <td><Price value={q && q.price} flash={changes[s]} /></td>
                      <td>
                        <span className={`num ${tone(q && q.change)}`} style={{ marginRight: 8 }}>{q ? signed(q.change) : "--"}</span>
                        <span className={`chip ${tone(q && q.changePct)}`}>{q ? pct(q.changePct) : "--"}</span>
                      </td>
                      <td><div style={{ width: 120, marginLeft: "auto" }}>{q && <Sparkline points={q.spark} base={q.prevClose} tone={tone(q.changePct)} height={30} area={false} />}</div></td>
                      <td className="num muted">{compact(q && q.volume)}</td>
                      <td><MoodChip s={summaries[s]} /></td>
                      <td>
                        <button className="btn ghost small danger" onClick={() => toggleWatch(s)} aria-label={`Remove ${s}`}>
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="dim" style={{ fontSize: 12.5, marginTop: 12 }}>
        Tip: add alerts for these stocks on the <Link to="/alerts" style={{ color: "var(--accent)" }}>alerts page</Link>.
      </p>
    </>
  );
}
