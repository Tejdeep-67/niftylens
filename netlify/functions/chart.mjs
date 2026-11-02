// GET /api/chart?symbol=RELIANCE&range=1y
// ranges: 1d (5 min candles), 5d (15 min), 1mo, 6mo, 1y, 2y (daily), 5y (weekly)
import { isKnownSymbol, yahooSymbol, getIndex } from "../../shared/symbols.js";
import { marketStatus } from "../../shared/market.js";
import { cached, json } from "../lib/http.js";
import { yahooChart } from "../lib/yahoo.js";
import { mcHistory } from "../lib/moneycontrol.js";

export const RANGES = {
  "1d": { interval: "5m", mc: "5", days: 5, intraday: true },
  "5d": { interval: "15m", mc: "15", days: 8, intraday: true },
  "1mo": { interval: "1d", mc: "1D", days: 32 },
  "6mo": { interval: "1d", mc: "1D", days: 183 },
  "1y": { interval: "1d", mc: "1D", days: 366 },
  "2y": { interval: "1d", mc: "1D", days: 731 },
  "5y": { interval: "1wk", mc: "1W", days: 1830 },
};

// moneycontrol gives us several days of intraday bars; for "1d" keep only the last session
function lastSession(candles) {
  if (!candles.length) return candles;
  const day = (t) => new Date(t + 330 * 60000).toISOString().slice(0, 10);
  const d = day(candles[candles.length - 1].t);
  return candles.filter((c) => day(c.t) === d);
}

async function fromMoneycontrol(symbol, range) {
  const cfg = RANGES[range];
  const idx = getIndex(symbol);
  const now = Math.floor(Date.now() / 1000);
  let candles = await mcHistory(idx ? idx.mc : symbol, !!idx, cfg.mc, now - cfg.days * 86400, now);
  if (range === "1d") candles = lastSession(candles);
  if (!candles.length) throw new Error("no candles");
  const lastC = candles[candles.length - 1];
  return {
    candles,
    meta: { price: lastC.c, prevClose: null, w52High: null, w52Low: null, time: null },
    source: "moneycontrol",
  };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
  const range = (url.searchParams.get("range") || "1y").trim();
  if (!isKnownSymbol(symbol)) return json({ error: "unknown symbol" }, 400);
  if (!RANGES[range]) return json({ error: "range must be one of " + Object.keys(RANGES).join(", ") }, 400);

  const cfg = RANGES[range];
  const market = marketStatus();
  const open = market.state !== "closed";
  const ttl = cfg.intraday ? (open ? 60e3 : 10 * 60e3) : open ? 10 * 60e3 : 60 * 60e3;

  try {
    const r = await cached(`chart:${symbol}:${range}`, ttl, async () => {
      try {
        return await yahooChart(yahooSymbol(symbol), range, cfg.interval);
      } catch (e) {
        return await fromMoneycontrol(symbol, range);
      }
    });
    return json(
      { symbol, range, interval: cfg.interval, fetchedAt: new Date(r.fetchedAt).toISOString(), stale: r.stale, ...r.value },
      200,
      cfg.intraday ? 60 : 600
    );
  } catch (err) {
    return json({ error: "Could not load chart data", detail: err.message }, 502);
  }
}
