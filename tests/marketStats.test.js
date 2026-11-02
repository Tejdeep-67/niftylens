import { describe, it, expect } from "vitest";
import { marketStats } from "../src/lib/marketStats.js";

describe("marketStats", () => {
  const quotes = {
    TCS: { price: 100, changePct: 2, volume: 10 },
    INFY: { price: 100, changePct: -1, volume: 50 },
    HDFCBANK: { price: 100, changePct: 0, volume: 1 },
    ICICIBANK: { price: 100, changePct: 1, volume: 5 },
  };
  const s = marketStats(quotes);
  it("counts advances and declines", () => {
    expect([s.adv, s.dec, s.unch]).toEqual([2, 1, 1]);
  });
  it("averages sectors", () => {
    const it = s.sectors.find((x) => x.name === "IT");
    expect(it.avg).toBeCloseTo(0.5);
  });
  it("sorts movers", () => {
    expect(s.gainers[0].symbol).toBe("TCS");
    expect(s.losers[0].symbol).toBe("INFY");
    expect(s.active[0].symbol).toBe("INFY");
  });
});
