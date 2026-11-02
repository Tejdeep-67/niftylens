// Yahoo Finance public chart endpoints (no key needed, but no CORS either,
// which is why this runs inside a Netlify Function).
import { fetchWithTimeout, round } from "./http.js";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

async function getJson(path) {
  let lastErr;
  for (const host of HOSTS) {
    try {
      const res = await fetchWithTimeout(host + path, {}, 7000);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// keep every nth point so sparklines stay small
export function downsample(points, max = 60) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

export function parseSparkResult(r) {
  const resp = r.response && r.response[0];
  if (!resp || !resp.meta) return null;
  const m = resp.meta;
  const closes = (resp.indicators && resp.indicators.quote && resp.indicators.quote[0].close) || [];
  const ts = resp.timestamp || [];
  const pts = [];
  for (let i = 0; i < ts.length; i++) if (closes[i] != null) pts.push([ts[i] * 1000, round(closes[i])]);
  const price = m.regularMarketPrice;
  const prev = m.chartPreviousClose ?? m.previousClose;
  if (price == null || prev == null) return null;
  return {
    price: round(price),
    prevClose: round(prev),
    change: round(price - prev),
    changePct: round(((price - prev) / prev) * 100),
    high: round(m.regularMarketDayHigh),
    low: round(m.regularMarketDayLow),
    volume: m.regularMarketVolume ?? null,
    w52High: round(m.fiftyTwoWeekHigh),
    w52Low: round(m.fiftyTwoWeekLow),
    time: m.regularMarketTime ? m.regularMarketTime * 1000 : null,
    spark: downsample(pts),
    source: "yahoo",
  };
}

// quotes for up to ~20 symbols per request
export async function yahooSpark(yahooSymbols) {
  const q = encodeURIComponent(yahooSymbols.join(","));
  const data = await getJson(`/v7/finance/spark?symbols=${q}&range=1d&interval=5m`);
  const out = {};
  for (const r of (data.spark && data.spark.result) || []) {
    const parsed = parseSparkResult(r);
    if (parsed) out[r.symbol] = parsed;
  }
  return out;
}

export function parseChart(data) {
  const res = data.chart && data.chart.result && data.chart.result[0];
  if (!res) throw new Error("empty chart response");
  const q = res.indicators.quote[0];
  const ts = res.timestamp || [];
  const candles = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.open[i] == null || q.close[i] == null) continue;
    candles.push({
      t: ts[i] * 1000,
      o: round(q.open[i]),
      h: round(q.high[i]),
      l: round(q.low[i]),
      c: round(q.close[i]),
      v: q.volume[i] || 0,
    });
  }
  const m = res.meta;
  return {
    candles,
    meta: {
      price: round(m.regularMarketPrice),
      prevClose: round(m.chartPreviousClose ?? m.previousClose),
      w52High: round(m.fiftyTwoWeekHigh),
      w52Low: round(m.fiftyTwoWeekLow),
      dayHigh: round(m.regularMarketDayHigh),
      dayLow: round(m.regularMarketDayLow),
      volume: m.regularMarketVolume ?? null,
      time: m.regularMarketTime ? m.regularMarketTime * 1000 : null,
    },
    source: "yahoo",
  };
}

export async function yahooChart(yahooSymbol, range, interval) {
  const data = await getJson(
    `/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}&includePrePost=false`
  );
  return parseChart(data);
}
