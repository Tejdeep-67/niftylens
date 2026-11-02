import { STOCKS } from "../../shared/symbols.js";

// breadth, sector averages and movers from the quotes map
export function marketStats(quotes) {
  const rows = STOCKS.map((s) => ({ ...s, q: quotes[s.symbol] })).filter((r) => r.q);
  const adv = rows.filter((r) => r.q.changePct > 0).length;
  const dec = rows.filter((r) => r.q.changePct < 0).length;
  const unch = rows.length - adv - dec;

  const bySector = {};
  for (const r of rows) (bySector[r.sector] ||= []).push(r.q.changePct);
  const sectors = Object.entries(bySector)
    .map(([name, arr]) => ({ name, avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length }))
    .sort((a, b) => b.avg - a.avg);

  const sorted = [...rows].sort((a, b) => b.q.changePct - a.q.changePct);
  const byValue = [...rows].sort((a, b) => b.q.price * (b.q.volume || 0) - a.q.price * (a.q.volume || 0));
  return {
    count: rows.length,
    adv,
    dec,
    unch,
    ratio: dec ? adv / dec : adv,
    sectors,
    gainers: sorted.slice(0, 5),
    losers: sorted.slice(-5).reverse(),
    active: byValue.slice(0, 5),
  };
}
