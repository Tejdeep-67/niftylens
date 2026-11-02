import { useEffect, useRef, useState } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import { sma, rsi } from "../../shared/indicators.js";
import { price, compact } from "../lib/format.js";

const IST = 19800; // lightweight-charts shows UTC, so shift times to IST

const COLORS = {
  up: "#2fd08c",
  down: "#ff5f6d",
  text: "#94a0b4",
  grid: "rgba(148,163,184,0.07)",
  border: "rgba(148,163,184,0.16)",
  sma20: "#7aa2ff",
  sma50: "#f5b84a",
};

function baseOptions(intraday) {
  return {
    autoSize: true,
    layout: { background: { type: "solid", color: "transparent" }, textColor: COLORS.text, fontFamily: "Inter Variable, system-ui, sans-serif", fontSize: 11 },
    grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
    rightPriceScale: { borderColor: COLORS.border },
    timeScale: { borderColor: COLORS.border, timeVisible: intraday, secondsVisible: false, rightOffset: 3 },
    crosshair: { mode: CrosshairMode.Normal },
    localization: { priceFormatter: (p) => price(p) },
  };
}

// candles: [{t, o, h, l, c, v}] (t in ms). `show` = how many bars from the end to display;
// indicators are computed on the full series so SMA50 is valid from the first visible bar.
export default function PriceChart({ candles, show, intraday, type = "candles", showSma = true, prevClose }) {
  const box = useRef();
  const rsiBox = useRef();
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!candles || !candles.length) return;
    const chart = createChart(box.current, baseOptions(intraday));
    const rchart = createChart(rsiBox.current, {
      ...baseOptions(intraday),
      rightPriceScale: { borderColor: COLORS.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { ...baseOptions(intraday).timeScale, visible: false },
      localization: { priceFormatter: (p) => p.toFixed(0) },
    });
    // one TradingView attribution (on the main chart) is enough
    rchart.applyOptions({ layout: { attributionLogo: false } });

    const all = candles;
    const closes = all.map((c) => c.c);
    const start = show ? Math.max(0, all.length - show) : 0;
    const time = (c) => Math.floor(c.t / 1000) + IST;
    const vis = all.slice(start);

    let main;
    if (type === "line") {
      main = chart.addAreaSeries({ lineColor: COLORS.sma20, topColor: "rgba(122,162,255,0.25)", bottomColor: "rgba(122,162,255,0)", lineWidth: 2 });
      main.setData(vis.map((c) => ({ time: time(c), value: c.c })));
    } else {
      main = chart.addCandlestickSeries({ upColor: COLORS.up, downColor: COLORS.down, borderVisible: false, wickUpColor: COLORS.up, wickDownColor: COLORS.down });
      main.setData(vis.map((c) => ({ time: time(c), open: c.o, high: c.h, low: c.l, close: c.c })));
    }
    if (prevClose && intraday) {
      main.createPriceLine({ price: prevClose, color: "rgba(148,163,184,.5)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "prev close" });
    }

    const vol = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(vis.map((c) => ({ time: time(c), value: c.v, color: c.c >= c.o ? "rgba(47,208,140,.35)" : "rgba(255,95,109,.35)" })));
    main.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.22 } });

    if (showSma) {
      const add = (period, color) => {
        const vals = sma(closes, period);
        const s = chart.addLineSeries({ color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(vis.map((c, i) => ({ time: time(c), value: vals[start + i] })).filter((p) => p.value != null));
      };
      add(20, COLORS.sma20);
      add(50, COLORS.sma50);
    }

    const r = rsi(closes, 14);
    const rs = rchart.addLineSeries({ color: "#c4b5fd", lineWidth: 1.5, priceLineVisible: false });
    rs.setData(vis.map((c, i) => ({ time: time(c), value: r[start + i] })).filter((p) => p.value != null));
    rs.createPriceLine({ price: 70, color: "rgba(255,95,109,.5)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    rs.createPriceLine({ price: 30, color: "rgba(47,208,140,.5)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false });

    chart.timeScale().fitContent();
    rchart.timeScale().fitContent();

    // keep both charts scrolled/zoomed together
    let syncing = false;
    const sync = (from, to) => (range) => {
      if (syncing || !range) return;
      syncing = true;
      to.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(sync(chart, rchart));
    rchart.timeScale().subscribeVisibleLogicalRangeChange(sync(rchart, chart));

    const byTime = new Map(vis.map((c, i) => [time(c), { ...c, rsi: r[start + i] }]));
    chart.subscribeCrosshairMove((p) => {
      if (!p || !p.time) return setHover(null);
      setHover(byTime.get(p.time) || null);
    });

    return () => {
      chart.remove();
      rchart.remove();
    };
  }, [candles, show, intraday, type, showSma, prevClose]);

  const last = candles && candles.length ? candles[candles.length - 1] : null;
  const h = hover || last;
  return (
    <div>
      <div className="chart-legend num" aria-live="off">
        {h && (
          <>
            <span>O {price(h.o)}</span>
            <span>H {price(h.h)}</span>
            <span>L {price(h.l)}</span>
            <span>C {price(h.c)}</span>
            <span>Vol {compact(h.v)}</span>
          </>
        )}
        {showSma && (
          <>
            <span><i style={{ background: COLORS.sma20 }} />SMA 20</span>
            <span><i style={{ background: COLORS.sma50 }} />SMA 50</span>
          </>
        )}
      </div>
      <div className="chart-box" ref={box} role="img" aria-label="Price chart" />
      <div className="chart-legend"><span><i style={{ background: "#c4b5fd" }} />RSI 14 (70 overbought / 30 oversold)</span></div>
      <div className="rsi-box" ref={rsiBox} role="img" aria-label="RSI chart" />
    </div>
  );
}
