import { NavLink, Link, Outlet } from "react-router-dom";
import { useMarket } from "../state/MarketData.jsx";
import { Logo, IconMarket, IconStar, IconWallet, IconNews, IconBell, IconInsight } from "./Icons.jsx";
import TickerTape from "./TickerTape.jsx";
import Toasts from "./Toasts.jsx";
import Search from "./Search.jsx";
import { istDateTime, istTime, timeAgo } from "../lib/format.js";
import { useEffect, useState } from "react";

const LINKS = [
  { to: "/", label: "Market", icon: IconMarket, end: true },
  { to: "/watchlist", label: "Watchlist", icon: IconStar },
  { to: "/portfolio", label: "Portfolio", icon: IconWallet },
  { to: "/news", label: "News", icon: IconNews },
  { to: "/insights", label: "Insights", icon: IconInsight },
];

function StatusPill() {
  const { market } = useMarket();
  const text =
    market.state === "open"
      ? market.special ? market.special + " live" : "Market open"
      : market.state === "pre-open"
      ? "Pre-open"
      : "Closed";
  const extra = market.state === "closed" && market.nextOpen ? `opens ${istDateTime(market.nextOpen)}` : market.state === "open" ? `till ${istTime(market.closesAt)}` : "";
  return (
    <span className={`status-pill ${market.state}`} title={market.reason || ""}>
      <span className="status-dot" />
      {text}
      {extra && <span className="dim long">· {extra}</span>}
    </span>
  );
}

// re-render every 20 s so "updated x ago" stays fresh
function useNow(ms = 20000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function DataNote() {
  const { meta, market } = useMarket();
  const now = useNow();
  return (
    <>
      <div className="delay-note">
        <span>
          {meta.mode === "live" && <span className="live-dot" aria-hidden="true" />}
          {meta.fetchedAt ? `Updated ${timeAgo(meta.fetchedAt, now)} (${istTime(meta.fetchedAt)} IST)` : meta.loading ? "Loading prices…" : ""}
        </span>
        <span>Prices may be delayed ~1–15 min · not for trading</span>
        {market.state !== "closed" ? <span>Auto refresh every 30 s</span> : <span>{market.reason}</span>}
      </div>
      {meta.mode === "sample" && (
        <div className="banner" role="status">
          Live data isn't reachable from here, so you're looking at a recorded sample snapshot (prices and headlines from {meta.fetchedAt ? istDateTime(meta.fetchedAt) : "an earlier session"} IST). On the deployed site this comes from the Netlify functions.
        </div>
      )}
      {meta.mode === "cached" && (
        <div className="banner" role="status">
          Couldn't reach the price sources just now ({meta.error}). Showing the last data saved on this device. It will retry automatically.
        </div>
      )}
      {meta.stale && meta.mode === "live" && (
        <div className="banner" role="status">The upstream source failed on the last refresh, so these prices are from the server cache.</div>
      )}
      {meta.failed && !meta.mode && (
        <div className="banner" role="alert">Prices couldn't be loaded ({meta.error}). Check your connection; it will retry.</div>
      )}
    </>
  );
}

export default function Layout() {
  const { rules } = useMarket();
  const active = rules.filter((r) => r.enabled).length;
  return (
    <div className="app">
      <a href="#main" className="skip">Skip to content</a>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand" aria-label="NiftyLens home">
            <Logo className="brand-mark" />
            <span>Nifty<b>Lens</b></span>
          </Link>
          <nav className="nav" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
            <NavLink to="/model">Model</NavLink>
          </nav>
          <div className="topbar-right">
            <Search />
            <StatusPill />
            <Link to="/alerts" className="icon-btn" aria-label={`Alerts (${active} active)`}>
              <IconBell />
              {active > 0 && <span className="badge">{active}</span>}
            </Link>
          </div>
        </div>
      </header>
      <TickerTape />
      <main id="main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="site">
        <div className="container">
          <p>
            NiftyLens is a student project by Tejdeep Kellampalli. Prices are delayed and can be wrong. This is not investment advice.
          </p>
          <p>
            Data: Yahoo Finance chart API (Moneycontrol chart API as fallback), Google News RSS, Economic Times, Mint and Business Standard RSS.
            Sentiment model trained on Financial PhraseBank (CC BY-NC-SA 3.0), SEntFiN 1.0 (MIT) and Twitter Financial News (MIT).
            Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts</a>.
          </p>
          <p>
            <a href="https://github.com/Tejdeep-67/niftylens" target="_blank" rel="noreferrer">Source on GitHub</a>
          </p>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Main mobile">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <l.icon />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <Toasts />
    </div>
  );
}
