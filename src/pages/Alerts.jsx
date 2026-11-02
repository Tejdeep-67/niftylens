import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getStock } from "../../shared/symbols.js";
import { useMarket } from "../state/MarketData.jsx";
import { ALERT_TYPES, describe, conditionMet } from "../lib/alerts.js";
import Search from "../components/Search.jsx";
import { IconTrash, IconBell } from "../components/Icons.jsx";
import { istDateTime, price, pct } from "../lib/format.js";

function NotificationStatus() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [perm, setPerm] = useState(supported ? Notification.permission : "unsupported");
  const { toast } = useMarket();
  const ask = async () => {
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") toast({ title: "Notifications on", body: "You'll get a browser notification when an alert fires (while this tab is open)." });
  };
  return (
    <div className="panel reveal">
      <div className="panel-head"><h2>Browser notifications</h2></div>
      {perm === "unsupported" && <p className="muted">This browser doesn't support notifications. Alerts will still show as in-app toasts.</p>}
      {perm === "default" && (
        <>
          <p className="muted" style={{ fontSize: 14 }}>Allow notifications to get alerted even when you're on another tab.</p>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={ask}><IconBell width={16} height={16} /> Enable notifications</button>
        </>
      )}
      {perm === "granted" && <p className="up" style={{ fontSize: 14 }}>Notifications are on.</p>}
      {perm === "denied" && <p className="muted" style={{ fontSize: 14 }}>Notifications are blocked for this site. You can allow them from the browser's site settings. In-app toasts still work.</p>}
      <p className="dim" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.55 }}>
        Alerts are checked in the browser on every price refresh (30 s while the market is open), so the tab needs to stay open.
        Each alert fires once when its condition becomes true and re-arms after the condition goes false again.
      </p>
    </div>
  );
}

export default function Alerts() {
  const { rules, setRules, alertLog, setAlertLog, quotes, watchlist, sentiments } = useMarket();
  const [params] = useSearchParams();
  const [symbol, setSymbol] = useState(params.get("symbol") || watchlist[0] || "RELIANCE");
  const [type, setType] = useState("above");
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const q = quotes[symbol];

  // sensible default value when the stock or type changes
  useEffect(() => {
    if (type === "above" && q) setValue((Math.ceil(q.price * 1.02 * 20) / 20).toFixed(2));
    else if (type === "below" && q) setValue((Math.floor(q.price * 0.98 * 20) / 20).toFixed(2));
    else if (type === "moveUp" || type === "moveDown") setValue("2");
    else if (type === "sentimentNeg") setValue("0.15");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, type]);

  const add = (e) => {
    e.preventDefault();
    const v = Number(value);
    if (!getStock(symbol)) return setErr("Pick a NIFTY 50 stock.");
    if (!(v > 0)) return setErr("Enter a value above 0.");
    if (type === "sentimentNeg" && v > 1) return setErr("Sentiment scores go from -1 to 1, so use something like 0.15.");
    setErr("");
    const rule = { id: Date.now(), symbol, type, value: v, enabled: true, created: Date.now() };
    // if the condition is already true right now, don't fire instantly; wait for it to reset first
    if (conditionMet(rule, q, sentiments[symbol])) rule.armed = false;
    setRules([rule, ...rules]);
  };

  const update = (id, patch) => setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Alerts</h1>
          <p>Price levels, big moves and news sentiment turning negative. Saved in this browser.</p>
        </div>
      </div>
      <div className="grid stock-grid">
        <div>
          <form className="panel reveal" onSubmit={add}>
            <div className="panel-head"><h2>New alert</h2>{q && <span className="sub num">{symbol} now {price(q.price)} ({pct(q.changePct)})</span>}</div>
            <div className="form-row">
              <label className="field">
                Stock <span className="num" style={{ color: "var(--accent)" }}>· {symbol}</span>
                <Search stocksOnly placeholder="Change stock…" onPick={setSymbol} className="w-full" />
              </label>
              <label className="field">
                Condition
                <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(ALERT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                </select>
              </label>
              <label className="field">
                {type === "sentimentNeg" ? "Score below −" : ALERT_TYPES[type].unit}
                <input className="input num" type="number" step="any" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
              </label>
              <button className="btn primary" type="submit">Create alert</button>
            </div>
            {err && <p className="down" style={{ fontSize: 13, marginTop: 10 }} role="alert">{err}</p>}
          </form>

          <div className="panel reveal" style={{ marginTop: 16 }}>
            <div className="panel-head"><h2>Your alerts</h2><span className="sub">{rules.filter((r) => r.enabled).length} active</span></div>
            {rules.length === 0 ? (
              <div className="empty">No alerts yet. Create one above.</div>
            ) : (
              <ul className="row-list">
                {rules.map((r) => (
                  <li key={r.id}>
                    <div className="row" style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
                      <div style={{ minWidth: 0 }}>
                        <Link to={`/stock/${encodeURIComponent(r.symbol)}`} className="sym">{r.symbol}</Link>
                        <div className="nm" style={{ whiteSpace: "normal" }}>
                          {describe(r)}
                          {r.lastFired ? ` · last fired ${istDateTime(r.lastFired)}` : ""}
                          {r.enabled && r.armed === false ? " · waiting to re-arm" : ""}
                        </div>
                      </div>
                      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }} className="muted">
                        <input type="checkbox" checked={r.enabled} onChange={(e) => update(r.id, { enabled: e.target.checked })} /> on
                      </label>
                      <button className="btn ghost small danger" aria-label="Delete alert" onClick={() => setRules(rules.filter((x) => x.id !== r.id))}><IconTrash /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="side-stack">
          <NotificationStatus />
          <div className="panel reveal">
            <div className="panel-head">
              <h2>History</h2>
              {alertLog.length > 0 && <button className="btn ghost small" onClick={() => setAlertLog([])}>clear</button>}
            </div>
            {alertLog.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>Nothing has fired yet.</p>
            ) : (
              <ul className="notes">
                {alertLog.slice(0, 15).map((l) => (
                  <li key={l.id}>{l.message} <span className="dim">({istDateTime(l.at)})</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
