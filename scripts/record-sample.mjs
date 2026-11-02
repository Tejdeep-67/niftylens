// Records a snapshot of what the functions return right now into public/sample/.
// The site falls back to this when the functions aren't reachable (e.g. a plain static preview),
// and shows a banner saying it's sample data.
// Run: node scripts/record-sample.mjs
import { mkdir, writeFile } from "node:fs/promises";
import quotes from "../netlify/functions/quotes.mjs";
import chart from "../netlify/functions/chart.mjs";
import news from "../netlify/functions/news.mjs";
import { STOCKS, INDICES } from "../shared/symbols.js";

const OUT = new URL("../public/sample/", import.meta.url);
const call = async (fn, path) => {
  const res = await fn(new Request("http://localhost" + path));
  if (res.status !== 200) throw new Error(path + " -> " + res.status);
  return res.json();
};
const safe = (s) => s.replace(/&/g, "and");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// candles as arrays to keep the files small
const pack = (d) => {
  const { candles, ...rest } = d;
  return { ...rest, c: candles.map((c) => [c.t, c.o, c.h, c.l, c.c, c.v]) };
};

await mkdir(new URL("charts/", OUT), { recursive: true });
await mkdir(new URL("news/", OUT), { recursive: true });

const q = await call(quotes, "/api/quotes");
await writeFile(new URL("quotes.json", OUT), JSON.stringify(q));
console.log("quotes", Object.keys(q.quotes).length);

const all = [...INDICES.map((i) => i.symbol), ...STOCKS.map((s) => s.symbol)];
for (const s of all) {
  const enc = encodeURIComponent(s);
  const d1 = await call(chart, `/api/chart?symbol=${enc}&range=1d`);
  const dy = await call(chart, `/api/chart?symbol=${enc}&range=1y`);
  await writeFile(new URL(`charts/${safe(s)}-1d.json`, OUT), JSON.stringify(pack(d1)));
  await writeFile(new URL(`charts/${safe(s)}-daily.json`, OUT), JSON.stringify(pack(dy)));
  await sleep(300);
}
console.log("charts done");

await writeFile(new URL("news/market.json", OUT), JSON.stringify(await call(news, "/api/news?scope=market")));
for (const s of STOCKS) {
  await writeFile(new URL(`news/${safe(s.symbol)}.json`, OUT), JSON.stringify(await call(news, `/api/news?symbol=${encodeURIComponent(s.symbol)}`)));
  await sleep(700);
}
console.log("news done");
