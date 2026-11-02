// Fetch helpers. Order of preference:
//   1. live data from our Netlify functions (/api/...)
//   2. the last good response saved in localStorage
//   3. a recorded sample snapshot shipped with the site (public/sample/)
// The caller gets { data, mode: "live" | "cached" | "sample", error }

const TIMEOUT = 12000;

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    const type = res.headers.get("content-type") || "";
    if (!type.includes("json")) throw new Error("API not reachable");
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  } finally {
    clearTimeout(t);
  }
}

function saveLocal(key, data) {
  try {
    localStorage.setItem("nl:cache:" + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // storage full - not a big deal
  }
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem("nl:cache:" + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// once the live API has failed we remember it for this session, so we don't
// wait for a timeout on every request
let apiDown = false;

export function isApiDown() {
  return apiDown;
}

export async function load(key, url, samplePath) {
  if (!apiDown) {
    try {
      const data = await getJson(url);
      saveLocal(key, data);
      return { data, mode: "live" };
    } catch (err) {
      if (err.message === "API not reachable") apiDown = true;
      const local = readLocal(key);
      if (local) return { data: local.data, mode: "cached", savedAt: local.at, error: err.message };
      if (samplePath) {
        const data = await loadSample(samplePath);
        if (data) return { data, mode: "sample", error: err.message };
      }
      throw err;
    }
  }
  const local = readLocal(key);
  if (samplePath) {
    const data = await loadSample(samplePath);
    if (data) return { data, mode: "sample", error: "API not reachable" };
  }
  if (local) return { data: local.data, mode: "cached", savedAt: local.at };
  throw new Error("API not reachable");
}

const sampleCache = new Map();
async function loadSample(path) {
  if (sampleCache.has(path)) return sampleCache.get(path);
  try {
    const res = await fetch("/sample/" + path);
    if (!res.ok) return null;
    const data = await res.json();
    sampleCache.set(path, data);
    return data;
  } catch {
    return null;
  }
}

// sample charts are stored as arrays to keep the files small
function expandCandles(data) {
  if (data && Array.isArray(data.c)) {
    return { ...data, candles: data.c.map(([t, o, h, l, c, v]) => ({ t, o, h, l, c, v })) };
  }
  return data;
}

export const api = {
  quotes: () => load("quotes", "/api/quotes", "quotes.json"),
  chart: async (symbol, range) => {
    // the sample only has 1d and 1y; shorter daily ranges are sliced from 1y
    const sampleRange = range === "1d" || range === "5d" ? "1d" : "1y";
    const r = await load(`chart:${symbol}:${range}`, `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, `charts/${fileSafe(symbol)}-${sampleRange}.json`);
    r.data = expandCandles(r.data);
    if (r.mode === "sample" && range !== sampleRange) {
      const days = { "1mo": 22, "6mo": 126 }[range];
      if (days) r.data = { ...r.data, candles: r.data.candles.slice(-days) };
    }
    return r;
  },
  news: (symbol) =>
    symbol
      ? load(`news:${symbol}`, `/api/news?symbol=${encodeURIComponent(symbol)}`, `news/${fileSafe(symbol)}.json`)
      : load("news:market", "/api/news?scope=market", "news/market.json"),
};

export function fileSafe(symbol) {
  return symbol.replace(/&/g, "and");
}
