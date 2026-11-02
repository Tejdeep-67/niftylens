import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStock, getIndex, isKnownSymbol } from "../../shared/symbols.js";
import { technicalSummary, annualVolatility, sma, rsi, last } from "../../shared/indicators.js";
import { useMarket } from "../state/MarketData.jsx";
import { api } from "../lib/api.js";
import { DataNote } from "../components/Layout.jsx";
import PriceChart from "../components/PriceChart.jsx";
import Price from "../components/Price.jsx";
import Gauge from "../components/Gauge.jsx";
import Sparkline from "../components/Sparkline.jsx";
import Skeleton from "../components/Skeleton.jsx";
import NewsList, { sentimentTrend } from "../components/NewsList.jsx";
import { IconStar, IconBell } from "../components/Icons.jsx";
import { price, pct, signed, tone, compact } from "../lib/format.js";

const RANGES = [
  { id: "1d", label: "1D", fetch: "1d", intraday: true },
  { id: "5d", label: "5D", fetch: "5d", intraday: true },
  { id: "1mo", label: "1M", fetch: "2y", show: 22 },
  { id: "6mo", label: "6M", fetch: "2y", show: 126 },
  { id: "1y", label: "1Y", fetch: "2y", show: 250 },
];

function useChart(symbol, range) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    api
      .chart(symbol, range)
      .then((r) => alive && setState({ loading: false, data: r.data, mode: r.mode }))
      .catch((e) => alive && setState({ loading: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, [symbol, range]);
  return state;
}

export default function Stock() {
  const { symbol: raw } = useParams();
  const symbol = decodeURIComponent(raw || "").toUpperCase();
  const known = isKnownSymbol(symbol);
  const info = getStock(symbol) || getIndex(symbol);
  const { quotes, changes, watchlist, toggleWatch } = useMarket();
  const [rangeId, setRangeId] = useState("6mo");
  const [type, setType] = useState("candles");
  const [smaOn, setSmaOn] = useState(true);
  const range = RANGES.find((r) => r.id === rangeId);
  const chart = useChart(known ? symbol : null, range.fetch);
  const daily = useChart(known ? symbol : null, "2y");
  const [news, setNews] = useState(null);
  const q = quotes[symbol];

  useEffect(() => {
    if (!getStock(symbol)) return;
    let alive = true;
    setNews(null);
    api.news(symbol).then((r) => alive && setNews(r.data)).catch((e) => alive && setNews({ error: e.message, items: [] }));
    return () => {
      alive = false;
    };
  }, [symbol]);

  useEffect(() => {
    if (info) document.title = `${symbol} ${q ? price(q.price) : ""} · NiftyLens`;
    return () => (document.title = "NiftyLens - NSE live dashboard with news sentiment");
  }, [symbol, q, info]);

  const tech = useMemo(() => {
    const candles = daily.data && daily.data.candles;
    if (!candles || candles.length < 60) return null;
    const closes = candles.map((c) => c.c);
    const year = candles.slice(-250);
    return {
      summary: technicalSummary(closes),
      vol: annualVolatility(closes.slice(-250)),
      hi52: Math.max(...year.map((c) => c.h)),
      lo52: Math.min(...year.map((c) => c.l)),
      ret1y: ((closes[closes.length - 1] - year[0].c) / year[0].c) * 100,
      rsiNow: last(rsi(closes, 14)),
      sma200: last(sma(closes, 200)),
    };
  }, [daily.data]);

  if (!known) {
    return (
      <div className="empty" style={{ paddingTop: 60 }}>
        <h1>Unknown symbol "{symbol}"</h1>
        <p style={{ marginTop: 8 }}>NiftyLens covers the NIFTY 50 stocks and three indices.</p>
        <Link className="btn primary" to="/">Back to market</Link>
      </div>
    );
  }

  const isStock = !!getStock(symbol);
  const watched = watchlist.includes(symbol);
  const hi = tech ? tech.hi52 : q && q.w52High;
  const lo = tech ? tech.lo52 : q && q.w52Low;
  const pos52 = q && hi && lo && hi > lo ? ((q.price - lo) / (hi - lo)) * 100 : null;
  const trend = news && news.items ? sentimentTrend(news.items) : [];

  return (
    <>
      <DataNote />
      <div className="stock-head reveal">
        <div>
          <div className="meta">
            <Link to="/" className="dim">Market</Link> <span className="dim">/</span> <span className="tag">{isStock ? info.sector : "Index"}</span>
            <span className="tag">NSE: {symbol}</span>
          </div>
          <h1 style={{ marginTop: 8 }}>{info.name}</h1>
          {isStock && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn small" onClick={() => toggleWatch(symbol)} aria-pressed={watched}>
                <IconStar filled={watched} width={15} height={15} style={{ color: watched ? "var(--warn)" : undefined }} />
                {watched ? "In watchlist" : "Add to watchlist"}
              </button>
              <Link className="btn small" to={`/alerts?symbol=${encodeURIComponent(symbol)}`}>
                <IconBell width={15} height={15} /> Set alert
              </Link>
            </div>
          )}
        </div>
        <div>
          {q ? (
            <>
              <div className="px">
                <Price value={q.price} flash={changes[symbol]} />
              </div>
              <div className={`px-chg num ${tone(q.change)}`}>
                {signed(q.change)} ({pct(q.changePct)}) today
              </div>
            </>
          ) : (
            <Skeleton h={40} w={200} />
          )}
        </div>
      </div>

      <div className="grid stock-grid">
        <div className="panel reveal">
          <div className="chart-toolbar">
            <div className="seg" role="group" aria-label="Range">
              {RANGES.map((r) => (
                <button key={r.id} aria-pressed={rangeId === r.id} onClick={() => setRangeId(r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className="seg" role="group" aria-label="Chart type">
                <button aria-pressed={type === "candles"} onClick={() => setType("candles")}>Candles</button>
                <button aria-pressed={type === "line"} onClick={() => setType("line")}>Line</button>
              </div>
              <div className="seg">
                <button aria-pressed={smaOn} onClick={() => setSmaOn((s) => !s)}>SMA</button>
              </div>
            </div>
          </div>
          {chart.loading && !chart.data ? (
            <Skeleton h={540} />
          ) : chart.error ? (
            <p className="empty">Chart data couldn't be loaded ({chart.error}).</p>
          ) : (
            <PriceChart
              candles={chart.data.candles}
              show={range.show}
              intraday={range.intraday}
              type={type}
              showSma={smaOn}
              prevClose={range.id === "1d" && q ? q.prevClose : null}
            />
          )}
          {chart.data && chart.data.source === "moneycontrol" && <p className="dim" style={{ fontSize: 12, marginTop: 8 }}>Chart served by the fallback source.</p>}
        </div>

        <div className="side-stack">
          <div className="panel reveal">
            <div className="panel-head"><h2>Key stats</h2></div>
            <div className="stats">
              <div className="stat"><div className="k">Prev close</div><div className="v num">{price(q && q.prevClose)}</div></div>
              <div className="stat"><div className="k">Volume</div><div className="v num">{compact(q && q.volume)}</div></div>
              <div className="stat"><div className="k">Day low</div><div className="v num">{price(q && q.low)}</div></div>
              <div className="stat"><div className="k">Day high</div><div className="v num">{price(q && q.high)}</div></div>
              <div className="stat"><div className="k">52w low</div><div className="v num">{price(lo)}</div></div>
              <div className="stat"><div className="k">52w high</div><div className="v num">{price(hi)}</div></div>
              <div className="stat"><div className="k">1Y return</div><div className={`v num ${tone(tech && tech.ret1y)}`}>{tech ? pct(tech.ret1y) : "--"}</div></div>
              <div className="stat"><div className="k">Volatility (1Y)</div><div className="v num">{tech ? tech.vol.toFixed(1) + "%" : "--"}</div></div>
            </div>
            {pos52 != null && (
              <div className="range-bar" style={{ marginTop: 14 }}>
                <div className="range-track"><div className="range-fill" style={{ left: `${Math.max(0, Math.min(100, pos52))}%` }} /></div>
                <div className="range-labels"><span>52w low</span><span>{pos52.toFixed(0)}% of range</span><span>52w high</span></div>
              </div>
            )}
          </div>

          <div className="panel reveal">
            <div className="panel-head">
              <h2>Technicals</h2>
              <span className="sub">daily</span>
            </div>
            {tech && tech.summary ? (
              <>
                <div className="stats">
                  <div className="stat"><div className="k">SMA 20</div><div className="v num">{price(tech.summary.sma20)}</div></div>
                  <div className="stat"><div className="k">SMA 50</div><div className="v num">{price(tech.summary.sma50)}</div></div>
                  <div className="stat"><div className="k">RSI 14</div><div className="v num">{tech.rsiNow.toFixed(1)}</div></div>
                  <div className="stat"><div className="k">Trend</div><div className={`v trend-tag ${tech.summary.trend === "Bullish" ? "up" : tech.summary.trend === "Bearish" ? "down" : ""}`}>{tech.summary.trend}</div></div>
                </div>
                <ul className="notes">
                  {tech.summary.notes.map((n) => <li key={n}>{n}</li>)}
                </ul>
                <p className="dim" style={{ fontSize: 12, marginTop: 10 }}>Rule-based reading of the indicators, not a recommendation.</p>
              </>
            ) : daily.loading ? (
              <Skeleton h={140} />
            ) : (
              <p className="muted">Not enough history.</p>
            )}
          </div>
        </div>
      </div>

      {isStock && (
        <div className="grid news-grid" style={{ marginTop: 16 }}>
          <div className="panel reveal">
            <div className="panel-head">
              <h2>News sentiment</h2>
              <span className="sub">last 7 days</span>
            </div>
            {!news ? (
              <Skeleton h={180} />
            ) : news.summary ? (
              <>
                <Gauge score={news.summary.score} label={news.summary.mood} sub={`${news.summary.n} headlines, newer ones weigh more`} size={200} />
                <div className="mood-counts">
                  <span className="chip up">{news.summary.counts.positive} pos</span>
                  <span className="chip flat">{news.summary.counts.neutral} neu</span>
                  <span className="chip down">{news.summary.counts.negative} neg</span>
                </div>
                {trend.length > 2 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="dim" style={{ fontSize: 12, marginBottom: 4 }}>Rolling sentiment (5 headlines), oldest → newest</div>
                    <Sparkline points={trend} base={0} height={50} tone={trend[trend.length - 1] >= 0 ? "up" : "down"} />
                  </div>
                )}
                <p className="dim" style={{ fontSize: 12.5, marginTop: 16, lineHeight: 1.55 }}>
                  Each headline gets P(positive) − P(negative) from the model, so the score runs from −1 to +1.
                  The gauge is a weighted average where a headline's weight halves every 48 hours.
                  Headlines can be mislabelled, so tap "why?" to see which words drove a label.
                </p>
              </>
            ) : (
              <p className="muted">News couldn't be loaded ({news.error}).</p>
            )}
          </div>
          <div className="panel reveal">
            <div className="panel-head">
              <h2>Headlines</h2>
              <Link to="/model" className="sub">how the model works →</Link>
            </div>
            {news ? <NewsList items={news.items || []} limit={12} /> : <Skeleton h={300} />}
          </div>
        </div>
      )}
    </>
  );
}
