import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useStored } from "../lib/storage.js";
import { evaluate } from "../lib/alerts.js";
import { marketStatus } from "../../shared/market.js";

const Ctx = createContext(null);
export const useMarket = () => useContext(Ctx);

const DEFAULT_WATCHLIST = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ITC", "SBIN"];

export function MarketDataProvider({ children }) {
  const [quotes, setQuotes] = useState({});
  const [meta, setMeta] = useState({ loading: true });
  const [market, setMarket] = useState(() => marketStatus());
  const [marketNews, setMarketNews] = useState(null);
  const [watchlist, setWatchlist] = useStored("nl:watchlist", DEFAULT_WATCHLIST);
  const [rules, setRules] = useStored("nl:alerts", []);
  const [alertLog, setAlertLog] = useStored("nl:alert-log", []);
  const [sentiments, setSentiments] = useState({});
  const [toasts, setToasts] = useState([]);
  const prevPrices = useRef({});
  const [changes, setChanges] = useState({}); // symbol -> "up" | "down" for the flash animation
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const toast = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts.slice(-3), { id, ...t }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.duration || 7000);
  }, []);
  const dismiss = (id) => setToasts((ts) => ts.filter((x) => x.id !== id));

  const runAlerts = useCallback(
    (q, s) => {
      const res = evaluate(rulesRef.current, q, s);
      if (!res.fired.length) {
        if (res.rules.some((r, i) => r !== rulesRef.current[i])) setRules(res.rules);
        return;
      }
      setRules(res.rules);
      setAlertLog((log) => [...res.fired.map((f) => ({ id: f.rule.id + ":" + f.at, symbol: f.rule.symbol, message: f.message, at: f.at })), ...log].slice(0, 50));
      for (const f of res.fired) {
        const kind = f.rule.type === "above" || f.rule.type === "moveUp" ? "up" : "down";
        toast({ title: "Alert · " + f.rule.symbol, body: f.message, kind });
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("NiftyLens: " + f.rule.symbol, { body: f.message, icon: "/favicon.svg", tag: String(f.rule.id) });
          } catch {
            /* some mobile browsers only allow notifications from a service worker */
          }
        }
      }
    },
    [setRules, setAlertLog, toast]
  );

  const sentRef = useRef(sentiments);
  sentRef.current = sentiments;

  const refreshQuotes = useCallback(async () => {
    try {
      const r = await api.quotes();
      const q = r.data.quotes || {};
      const ch = {};
      for (const [s, v] of Object.entries(q)) {
        const prev = prevPrices.current[s];
        if (prev != null && v.price !== prev) ch[s] = v.price > prev ? "up" : "down";
        prevPrices.current[s] = v.price;
      }
      setChanges(ch);
      setQuotes(q);
      setMeta({ loading: false, mode: r.mode, fetchedAt: r.data.fetchedAt, stale: r.data.stale, savedAt: r.savedAt, sources: r.data.sources, error: r.error });
      if (r.mode === "live") runAlerts(q, sentRef.current);
    } catch (err) {
      setMeta((m) => ({ ...m, loading: false, error: err.message, failed: true }));
    }
  }, [runAlerts]);

  // poll prices: every 30 s while the market is open, every 5 min otherwise,
  // and not at all while the tab is hidden
  useEffect(() => {
    let timer;
    let stopped = false;
    const tick = async () => {
      const m = marketStatus();
      setMarket(m);
      if (document.visibilityState === "visible") await refreshQuotes();
      if (stopped) return;
      timer = setTimeout(tick, m.state === "closed" ? 5 * 60e3 : 30e3);
    };
    tick();
    const onVis = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshQuotes]);

  // market news every 10 minutes
  useEffect(() => {
    let alive = true;
    const loadNews = async () => {
      try {
        const r = await api.news();
        if (alive) setMarketNews({ ...r.data, mode: r.mode });
      } catch (err) {
        if (alive) setMarketNews({ error: err.message, items: [] });
      }
    };
    loadNews();
    const t = setInterval(loadNews, 10 * 60e3);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // sentiment for stocks that have a sentiment alert (checked every 10 min)
  const sentimentSymbols = [...new Set(rules.filter((r) => r.enabled && r.type === "sentimentNeg").map((r) => r.symbol))].sort().join(",");
  useEffect(() => {
    if (!sentimentSymbols) return;
    let alive = true;
    const check = async () => {
      const out = {};
      for (const s of sentimentSymbols.split(",")) {
        try {
          const r = await api.news(s);
          out[s] = r.data.summary;
        } catch {
          /* skip */
        }
      }
      if (!alive) return;
      setSentiments((prev) => {
        const next = { ...prev, ...out };
        sentRef.current = next;
        return next;
      });
      runAlerts(quotesRef.current, { ...sentRef.current, ...out });
    };
    check();
    const t = setInterval(check, 10 * 60e3);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [sentimentSymbols, runAlerts]);

  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;

  const toggleWatch = (symbol) =>
    setWatchlist((w) => (w.includes(symbol) ? w.filter((s) => s !== symbol) : [...w, symbol]));

  const value = {
    quotes,
    meta,
    market,
    changes,
    marketNews,
    watchlist,
    setWatchlist,
    toggleWatch,
    rules,
    setRules,
    alertLog,
    setAlertLog,
    sentiments,
    toasts,
    toast,
    dismiss,
    refreshQuotes,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
