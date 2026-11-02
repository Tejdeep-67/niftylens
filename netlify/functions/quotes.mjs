// GET /api/quotes?symbols=RELIANCE,TCS,NIFTY50
// GET /api/quotes            -> everything (NIFTY 50 stocks + 3 indices)
//
// Always fetches the whole universe (53 symbols) and caches it, then returns
// the symbols that were asked for. That way every visitor shares one cache entry.
import { STOCKS, INDICES, isKnownSymbol, yahooSymbol, getIndex } from "../../shared/symbols.js";
import { marketStatus } from "../../shared/market.js";
import { cached, json, mapLimit } from "../lib/http.js";
import { yahooSpark } from "../lib/yahoo.js";
import { mcQuote } from "../lib/moneycontrol.js";

const ALL = [...INDICES.map((i) => i.symbol), ...STOCKS.map((s) => s.symbol)];
const SYMBOL_RE = /^[A-Z0-9&-]{1,15}$/;

export function parseSymbols(param) {
  if (!param) return { symbols: ALL };
  const list = [...new Set(param.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (list.length > 60) return { error: "too many symbols (max 60)" };
  const bad = list.filter((s) => !SYMBOL_RE.test(s) || !isKnownSymbol(s));
  if (bad.length) return { error: "unknown symbol(s): " + bad.slice(0, 5).join(", ") };
  return { symbols: list };
}

async function fetchUniverse() {
  const quotes = {};
  // 1) yahoo spark in batches of 20
  const ySyms = ALL.map((s) => [s, yahooSymbol(s)]);
  const batches = [];
  for (let i = 0; i < ySyms.length; i += 20) batches.push(ySyms.slice(i, i + 20));
  const results = await Promise.allSettled(batches.map((b) => yahooSpark(b.map((x) => x[1]))));
  results.forEach((r, bi) => {
    if (r.status !== "fulfilled") return;
    for (const [sym, ysym] of batches[bi]) if (r.value[ysym]) quotes[sym] = r.value[ysym];
  });

  // 2) anything missing -> moneycontrol fallback
  const missing = ALL.filter((s) => !quotes[s]);
  if (missing.length) {
    const fb = await mapLimit(missing, 8, (sym) => {
      const idx = getIndex(sym);
      return mcQuote(idx ? idx.mc : sym, !!idx);
    });
    missing.forEach((sym, i) => {
      if (fb[i] && !fb[i].error) quotes[sym] = fb[i];
    });
  }
  if (Object.keys(quotes).length < ALL.length / 2) {
    throw new Error("price sources unavailable");
  }
  return quotes;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const parsed = parseSymbols(url.searchParams.get("symbols"));
  if (parsed.error) return json({ error: parsed.error }, 400);

  const market = marketStatus();
  // refresh often while the market is open, rarely when it's closed
  const ttl = market.state === "closed" ? 5 * 60 * 1000 : 30 * 1000;

  try {
    const r = await cached("universe", ttl, fetchUniverse);
    const quotes = {};
    const sources = {};
    for (const s of parsed.symbols) {
      const q = r.value[s];
      if (!q) continue;
      quotes[s] = q;
      sources[q.source] = (sources[q.source] || 0) + 1;
    }
    return json(
      {
        fetchedAt: new Date(r.fetchedAt).toISOString(),
        stale: r.stale,
        note: "Prices may be delayed (about 1-15 min). Not for trading.",
        market,
        sources,
        missing: parsed.symbols.filter((s) => !quotes[s]),
        quotes,
      },
      200,
      market.state === "closed" ? 120 : 20
    );
  } catch (err) {
    return json({ error: "Could not load prices right now", detail: err.message, market }, 502);
  }
}
