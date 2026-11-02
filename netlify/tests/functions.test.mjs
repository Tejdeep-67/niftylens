// Tests for the Netlify functions. Run with: npm run test:fn
// The default tests mock fetch. Set LIVE=1 to also hit the real sources.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import quotes, { parseSymbols } from "../functions/quotes.mjs";
import chart from "../functions/chart.mjs";
import { parseSparkResult, parseChart, downsample } from "../lib/yahoo.js";
import { cached, clearCache } from "../lib/http.js";

const realFetch = globalThis.fetch;

function sparkResult(sym, price, prev) {
  return {
    symbol: sym,
    response: [
      {
        meta: { regularMarketPrice: price, chartPreviousClose: prev, regularMarketDayHigh: price + 5, regularMarketDayLow: prev - 5, regularMarketVolume: 1000, fiftyTwoWeekHigh: 2000, fiftyTwoWeekLow: 100, regularMarketTime: 1793613600 },
        timestamp: [1793591100, 1793591400],
        indicators: { quote: [{ close: [prev, price] }] },
      },
    ],
  };
}

// fake upstreams: yahoo spark answers for every symbol asked, moneycontrol returns two daily bars
function mockFetch({ yahooStatus = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (u.hostname.includes("yahoo")) {
      if (yahooStatus !== 200) return new Response("Too Many Requests", { status: yahooStatus });
      if (u.pathname.includes("spark")) {
        const syms = u.searchParams.get("symbols").split(",");
        return Response.json({ spark: { result: syms.map((s) => sparkResult(s, 110, 100)) } });
      }
      return Response.json({
        chart: { result: [{ meta: { regularMarketPrice: 105, chartPreviousClose: 100 }, timestamp: [1, 2], indicators: { quote: [{ open: [100, 101], high: [102, 106], low: [99, 100], close: [101, 105], volume: [10, 20] }] } }] },
      });
    }
    if (u.hostname.includes("moneycontrol")) {
      return Response.json({ s: "ok", t: [1793318400, 1793597400], o: [90, 95], h: [96, 99], l: [89, 94], c: [95, 98], v: [500, 600] });
    }
    return new Response("not found", { status: 404 });
  };
  return calls;
}

describe("input validation", () => {
  test("accepts known symbols and indices", () => {
    assert.deepEqual(parseSymbols("reliance, TCS,NIFTY50").symbols, ["RELIANCE", "TCS", "NIFTY50"]);
  });
  test("rejects unknown or weird symbols", () => {
    assert.match(parseSymbols("AAPL").error, /unknown/);
    assert.match(parseSymbols("../etc/passwd").error, /unknown/);
  });
  test("no param means the whole universe", () => {
    assert.equal(parseSymbols(null).symbols.length, 53);
  });
  test("quotes returns 400 for bad symbols", async () => {
    const res = await quotes(new Request("http://localhost/api/quotes?symbols=FAKE"));
    assert.equal(res.status, 400);
  });
  test("chart validates range", async () => {
    const res = await chart(new Request("http://localhost/api/chart?symbol=TCS&range=10y"));
    assert.equal(res.status, 400);
  });
});

describe("parsers", () => {
  test("spark result -> quote", () => {
    const q = parseSparkResult(sparkResult("TCS.NS", 110, 100));
    assert.equal(q.change, 10);
    assert.equal(q.changePct, 10);
    assert.equal(q.spark.length, 2);
  });
  test("chart parser skips empty candles", () => {
    const d = parseChart({ chart: { result: [{ meta: {}, timestamp: [1, 2, 3], indicators: { quote: [{ open: [1, null, 3], high: [1, null, 3], low: [1, null, 3], close: [1, null, 3], volume: [1, null, 3] }] } }] } });
    assert.equal(d.candles.length, 2);
  });
  test("downsample keeps first and last", () => {
    const pts = Array.from({ length: 300 }, (_, i) => i);
    const d = downsample(pts, 60);
    assert.equal(d.length, 60);
    assert.equal(d[0], 0);
    assert.equal(d[59], 299);
  });
});

describe("quotes with mocked sources", () => {
  beforeEach(() => clearCache());

  test("uses yahoo when it works and caches the result", async () => {
    const calls = mockFetch();
    const res = await quotes(new Request("http://localhost/api/quotes?symbols=TCS,NIFTY50"));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.quotes.TCS.price, 110);
    assert.deepEqual(body.sources, { yahoo: 2 });
    const n = calls.length;
    await quotes(new Request("http://localhost/api/quotes?symbols=INFY"));
    assert.equal(calls.length, n, "second call should come from cache");
    globalThis.fetch = realFetch;
  });

  test("falls back to moneycontrol when yahoo rate limits", async () => {
    mockFetch({ yahooStatus: 429 });
    const res = await quotes(new Request("http://localhost/api/quotes?symbols=RELIANCE"));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.quotes.RELIANCE.source, "moneycontrol");
    assert.equal(body.quotes.RELIANCE.prevClose, 95);
    assert.equal(body.quotes.RELIANCE.price, 98);
    globalThis.fetch = realFetch;
  });

  test("chart falls back too", async () => {
    mockFetch({ yahooStatus: 500 });
    const res = await chart(new Request("http://localhost/api/chart?symbol=INFY&range=6mo"));
    const body = await res.json();
    assert.equal(body.source, "moneycontrol");
    assert.equal(body.candles.length, 2);
    globalThis.fetch = realFetch;
  });
});

describe("cache", () => {
  beforeEach(() => clearCache());
  test("serves stale data if the refresh fails", async () => {
    const a = await cached("k", -1, async () => 1); // expires immediately
    assert.equal(a.value, 1);
    const b = await cached("k", 1000, async () => {
      throw new Error("down");
    });
    assert.equal(b.value, 1);
    assert.equal(b.stale, true);
  });
});

if (process.env.LIVE) {
  describe("live sources", () => {
    beforeEach(() => {
      clearCache();
      globalThis.fetch = realFetch;
    });
    test("real quotes for all 53 symbols", async () => {
      const res = await quotes(new Request("http://localhost/api/quotes"));
      const body = await res.json();
      assert.equal(res.status, 200, body.detail);
      console.log("  sources:", body.sources, "missing:", body.missing);
      assert.ok(Object.keys(body.quotes).length >= 50);
      assert.ok(body.quotes.NIFTY50.price > 1000);
    });
    test("real 1y chart", async () => {
      const res = await chart(new Request("http://localhost/api/chart?symbol=HDFCBANK&range=1y"));
      const body = await res.json();
      assert.equal(res.status, 200);
      console.log("  chart source:", body.source, body.candles.length, "candles");
      assert.ok(body.candles.length > 200);
    });
  });
}
