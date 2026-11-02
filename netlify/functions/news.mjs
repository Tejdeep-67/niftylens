// GET /api/news?symbol=TCS     -> recent headlines about one stock (Google News RSS)
// GET /api/news?scope=market   -> market headlines (ET Markets, Mint, Business Standard)
// Every headline is scored with the sentiment model (shared/sentiment.js).
import { getStock } from "../../shared/symbols.js";
import { createScorer, aggregate } from "../../shared/sentiment.js";
import model from "../../shared/sentiment-model.js";
import { cached, fetchWithTimeout, json } from "../lib/http.js";
import { parseRss, dedupe } from "../lib/rss.js";

const scorer = createScorer(model);

export const MARKET_FEEDS = [
  { name: "Economic Times", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
  { name: "Mint", url: "https://www.livemint.com/rss/markets" },
  { name: "Business Standard", url: "https://www.business-standard.com/rss/markets-106.rss" },
];

// extra names people use in headlines
const ALIASES = {
  RELIANCE: ["ril", "reliance"],
  TMPV: ["tata motors"],
  ETERNAL: ["zomato", "eternal", "blinkit"],
  INDIGO: ["indigo", "interglobe"],
  LT: ["l&t", "larsen"],
  "M&M": ["m&m", "mahindra"],
  HINDUNILVR: ["hul", "hindustan unilever"],
  BHARTIARTL: ["airtel"],
  SBIN: ["sbi", "state bank"],
  HCLTECH: ["hcl"],
  "BAJAJ-AUTO": ["bajaj auto"],
  DRREDDY: ["dr reddy", "dr. reddy"],
  POWERGRID: ["power grid", "powergrid"],
  ULTRACEMCO: ["ultratech"],
  JIOFIN: ["jio financial", "jio fin"],
  ADANIPORTS: ["adani ports", "apsez"],
  MAXHEALTH: ["max healthcare"],
  SUNPHARMA: ["sun pharma"],
  KOTAKBANK: ["kotak"],
  TATACONSUM: ["tata consumer"],
  BEL: ["bharat electronics", "bel"],
  BSE: ["bse"],
};

export function keywordsFor(stock) {
  const k = new Set([stock.symbol.toLowerCase(), stock.short.toLowerCase()]);
  for (const a of ALIASES[stock.symbol] || []) k.add(a);
  return [...k];
}

export function isRelevant(title, keywords) {
  const t = " " + title.toLowerCase() + " ";
  return keywords.some((k) => {
    // short words like "itc", "bel" need word boundaries
    if (k.length <= 4) return new RegExp(`[^a-z]${k.replace(/[.&]/g, "\\$&")}[^a-z]`).test(t);
    return t.includes(k);
  });
}

function score(items) {
  return items.map((it) => {
    const p = scorer.predict(it.title);
    return {
      ...it,
      label: p.label,
      score: Math.round(p.score * 1000) / 1000,
      confidence: Math.round(p.confidence * 1000) / 1000,
    };
  });
}

async function fetchFeed(url, source) {
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } }, 7000);
  return parseRss(await res.text(), source);
}

async function stockNews(stock) {
  const q = `"${stock.q}" when:7d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  let items = await fetchFeed(url, "");
  const kw = keywordsFor(stock);
  const relevant = items.filter((it) => isRelevant(it.title, kw));
  if (relevant.length >= 5) items = relevant;
  return dedupe(items)
    .sort((a, b) => (b.published || "").localeCompare(a.published || ""))
    .slice(0, 30);
}

async function marketNews() {
  const results = await Promise.allSettled(MARKET_FEEDS.map((f) => fetchFeed(f.url, f.name)));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (!items.length) throw new Error("all market feeds failed");
  const cutoff = Date.now() - 3 * 86400e3;
  return dedupe(items.filter((it) => !it.published || Date.parse(it.published) > cutoff))
    .sort((a, b) => (b.published || "").localeCompare(a.published || ""))
    .slice(0, 40);
}

export default async function handler(req) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();

  let key;
  let loader;
  if (scope === "market") {
    key = "news:market";
    loader = marketNews;
  } else {
    const stock = getStock(symbol);
    if (!stock) return json({ error: "pass ?symbol=<NIFTY 50 symbol> or ?scope=market" }, 400);
    key = "news:" + symbol;
    loader = () => stockNews(stock);
  }

  try {
    const r = await cached(key, 10 * 60e3, async () => score(await loader()));
    const items = r.value;
    return json(
      {
        scope: scope === "market" ? "market" : "stock",
        symbol: scope === "market" ? null : symbol,
        fetchedAt: new Date(r.fetchedAt).toISOString(),
        stale: r.stale,
        model: model.info.type,
        summary: aggregate(items),
        items,
      },
      200,
      600
    );
  } catch (err) {
    return json({ error: "Could not load news", detail: err.message }, 502);
  }
}
