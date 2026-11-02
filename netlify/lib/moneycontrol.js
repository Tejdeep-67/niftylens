// Fallback source: Moneycontrol's public chart history endpoint (TradingView UDF format).
// Used only when Yahoo fails or rate-limits us.
import { fetchWithTimeout, round } from "./http.js";

const BASE = "https://priceapi.moneycontrol.com/techCharts/indianMarket";

// resolution: "1", "5", "15", "60", "1D", "1W"
export async function mcHistory(mcSymbol, isIndex, resolution, fromSec, toSec) {
  const kind = isIndex ? "index" : "stock";
  const url =
    `${BASE}/${kind}/history?symbol=${encodeURIComponent(mcSymbol)}` +
    `&resolution=${resolution}&from=${fromSec}&to=${toSec}&countback=2000&currencyCode=INR`;
  const res = await fetchWithTimeout(url, {}, 7000);
  const d = await res.json();
  if (d.s !== "ok" || !Array.isArray(d.t)) throw new Error("moneycontrol: " + (d.errmsg || d.s));
  const candles = [];
  for (let i = 0; i < d.t.length; i++) {
    if (d.c[i] == null) continue;
    candles.push({ t: d.t[i] * 1000, o: round(d.o[i]), h: round(d.h[i]), l: round(d.l[i]), c: round(d.c[i]), v: d.v ? d.v[i] || 0 : 0 });
  }
  return candles;
}

// build a quote from the last two daily bars (today's bar updates during the session)
export async function mcQuote(mcSymbol, isIndex) {
  const now = Math.floor(Date.now() / 1000);
  const daily = await mcHistory(mcSymbol, isIndex, "1D", now - 15 * 86400, now);
  if (daily.length < 2) throw new Error("not enough daily bars");
  const today = daily[daily.length - 1];
  const prev = daily[daily.length - 2];
  return {
    price: today.c,
    prevClose: prev.c,
    change: round(today.c - prev.c),
    changePct: round(((today.c - prev.c) / prev.c) * 100),
    high: today.h,
    low: today.l,
    volume: today.v || null,
    w52High: null,
    w52Low: null,
    time: null, // the daily bar only has the session start time
    spark: null,
    source: "moneycontrol",
  };
}
