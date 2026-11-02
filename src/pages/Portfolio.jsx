import { useState } from "react";
import { Link } from "react-router-dom";
import { getStock } from "../../shared/symbols.js";
import { useMarket } from "../state/MarketData.jsx";
import { useStored } from "../lib/storage.js";
import { DataNote } from "../components/Layout.jsx";
import Search from "../components/Search.jsx";
import Price from "../components/Price.jsx";
import { IconTrash } from "../components/Icons.jsx";
import { rupees, pct, tone, price } from "../lib/format.js";

export function portfolioTotals(holdings, quotes) {
  let invested = 0, current = 0, day = 0;
  const rows = holdings.map((h) => {
    const q = quotes[h.symbol];
    const inv = h.qty * h.avg;
    const cur = q ? h.qty * q.price : inv;
    const d = q ? h.qty * q.change : 0;
    invested += inv;
    current += cur;
    day += d;
    return { ...h, q, inv, cur, pnl: cur - inv, pnlPct: inv ? ((cur - inv) / inv) * 100 : 0, day: d };
  });
  return { rows, invested, current, pnl: current - invested, pnlPct: invested ? ((current - invested) / invested) * 100 : 0, day };
}

const PALETTE = ["#7aa2ff", "#2fd08c", "#f5b84a", "#c4b5fd", "#ff8fa3", "#5eead4", "#fca5a5", "#93c5fd", "#fde68a", "#a7f3d0"];

function Allocation({ rows, total }) {
  if (!rows.length || !total) return null;
  const sorted = [...rows].sort((a, b) => b.cur - a.cur);
  return (
    <div className="panel reveal" style={{ marginTop: 16 }}>
      <div className="panel-head"><h2>Allocation</h2><span className="sub">by current value</span></div>
      <div className="breadth-bar" style={{ height: 14 }}>
        {sorted.map((r, i) => (
          <div key={r.id} title={`${r.symbol} ${((r.cur / total) * 100).toFixed(1)}%`} style={{ width: (r.cur / total) * 100 + "%", background: PALETTE[i % PALETTE.length] }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 12, fontSize: 13 }}>
        {sorted.map((r, i) => (
          <span key={r.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
            {r.symbol} <span className="num muted">{((r.cur / total) * 100).toFixed(1)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Portfolio() {
  const { quotes, changes } = useMarket();
  const [holdings, setHoldings] = useStored("nl:portfolio", []);
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [err, setErr] = useState("");
  const t = portfolioTotals(holdings, quotes);

  const add = (e) => {
    e.preventDefault();
    const q = Number(qty), a = Number(avg);
    if (!getStock(symbol)) return setErr("Pick a NIFTY 50 stock from the search.");
    if (!(q > 0) || !Number.isFinite(q)) return setErr("Quantity must be more than 0.");
    if (!(a > 0)) return setErr("Average price must be more than 0.");
    setErr("");
    // buying more of the same stock -> merge and recompute the average price
    const existing = holdings.find((h) => h.symbol === symbol);
    if (existing) {
      const nq = existing.qty + q;
      const navg = (existing.qty * existing.avg + q * a) / nq;
      setHoldings(holdings.map((h) => (h.symbol === symbol ? { ...h, qty: nq, avg: Math.round(navg * 100) / 100 } : h)));
    } else {
      setHoldings([...holdings, { id: Date.now(), symbol, qty: q, avg: a }]);
    }
    setSymbol(""); setQty(""); setAvg("");
  };

  return (
    <>
      <DataNote />
      <div className="page-head">
        <div>
          <h1>Portfolio</h1>
          <p>Track your holdings and P&amp;L with live-ish prices. Everything stays in this browser (localStorage).</p>
        </div>
      </div>

      <div className="kpis">
        <div className="panel kpi reveal"><div className="k">Invested</div><div className="v num">{rupees(t.invested)}</div></div>
        <div className="panel kpi reveal"><div className="k">Current value</div><div className="v num">{rupees(t.current)}</div></div>
        <div className="panel kpi reveal"><div className="k">Total P&amp;L</div><div className={`v num ${tone(t.pnl)}`}>{rupees(t.pnl)} <span style={{ fontSize: 14 }}>{pct(t.pnlPct)}</span></div></div>
        <div className="panel kpi reveal"><div className="k">Today</div><div className={`v num ${tone(t.day)}`}>{rupees(t.day)}</div></div>
      </div>

      <form className="panel reveal" style={{ marginTop: 16 }} onSubmit={add}>
        <div className="panel-head"><h2>Add a holding</h2></div>
        <div className="form-row">
          <label className="field">
            Stock {symbol && <span className="num" style={{ color: "var(--accent)" }}>· {symbol}</span>}
            <Search stocksOnly placeholder={symbol || "Search stock…"} onPick={(s) => { setSymbol(s); if (!avg && quotes[s]) setAvg(String(quotes[s].price)); }} className="w-full" />
          </label>
          <label className="field">
            Quantity
            <input className="input num" type="number" min="1" step="1" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" />
          </label>
          <label className="field">
            Avg buy price (₹)
            <input className="input num" type="number" min="0" step="0.05" inputMode="decimal" value={avg} onChange={(e) => setAvg(e.target.value)} placeholder="2450.50" />
          </label>
          <button className="btn primary" type="submit">Add</button>
        </div>
        {err && <p className="down" style={{ fontSize: 13, marginTop: 10 }} role="alert">{err}</p>}
      </form>

      <div className="panel reveal" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Holdings</h2><span className="sub">{holdings.length} stocks</span></div>
        {t.rows.length === 0 ? (
          <div className="empty">
            No holdings yet. Add one above, or
            <div><button className="btn small" onClick={() => setHoldings([{ id: 1, symbol: "TCS", qty: 5, avg: 3200 }, { id: 2, symbol: "ITC", qty: 40, avg: 410 }, { id: 3, symbol: "HDFCBANK", qty: 12, avg: 950 }])}>load an example portfolio</button></div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Stock</th><th>Qty</th><th>Avg</th><th>LTP</th><th>Value</th><th>P&amp;L</th><th>Today</th><th><span className="sr-only">Remove</span></th></tr>
              </thead>
              <tbody>
                {t.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td-sym"><Link to={`/stock/${encodeURIComponent(r.symbol)}`}>{r.symbol}<span className="nm">{getStock(r.symbol)?.short}</span></Link></td>
                    <td className="num">{r.qty}</td>
                    <td className="num muted">{price(r.avg)}</td>
                    <td><Price value={r.q && r.q.price} flash={changes[r.symbol]} /></td>
                    <td className="num">{rupees(r.cur)}</td>
                    <td><span className={`num ${tone(r.pnl)}`}>{rupees(r.pnl)}</span> <span className={`chip ${tone(r.pnl)}`}>{pct(r.pnlPct)}</span></td>
                    <td className={`num ${tone(r.day)}`}>{rupees(r.day)}</td>
                    <td><button className="btn ghost small danger" aria-label={`Remove ${r.symbol}`} onClick={() => setHoldings(holdings.filter((h) => h.id !== r.id))}><IconTrash /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Allocation rows={t.rows} total={t.current} />
    </>
  );
}
