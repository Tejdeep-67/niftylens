import { STOCKS } from "../../shared/symbols.js";
import { useMarket } from "../state/MarketData.jsx";
import { price, pct, tone } from "../lib/format.js";
import { Link } from "react-router-dom";

export default function TickerTape() {
  const { quotes } = useMarket();
  const items = STOCKS.map((s) => ({ s: s.symbol, q: quotes[s.symbol] })).filter((x) => x.q);
  if (!items.length) return <div className="tape" style={{ height: 35 }} aria-hidden="true" />;
  const row = (dup) =>
    items.map(({ s, q }) => (
      <Link key={s + dup} to={`/stock/${encodeURIComponent(s)}`} className="tape-item" tabIndex={dup ? -1 : 0} aria-hidden={dup ? "true" : undefined}>
        <span className="sym">{s}</span>
        <span className="num">{price(q.price)}</span>
        <span className={`num ${tone(q.changePct)}`}>{pct(q.changePct)}</span>
      </Link>
    ));
  return (
    <div className="tape" aria-label="NIFTY 50 ticker">
      <div className="tape-track">
        {row("")}
        {row("-dup")}
      </div>
    </div>
  );
}
