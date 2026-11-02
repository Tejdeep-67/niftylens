import { describe, it, expect } from "vitest";
import { sma, ema, rsi, macd, pctChange, annualVolatility, technicalSummary } from "../shared/indicators.js";

describe("sma", () => {
  it("averages a sliding window", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
  it("returns nulls when not enough data", () => {
    expect(sma([1, 2], 5)).toEqual([null, null]);
  });
});

describe("ema", () => {
  it("is seeded with the sma and follows the 2/(n+1) rule", () => {
    const out = ema([2, 4, 6, 8], 3);
    expect(out[2]).toBeCloseTo(4);
    expect(out[3]).toBeCloseTo(8 * 0.5 + 4 * 0.5);
  });
});

describe("rsi", () => {
  // classic example from Wilder's book / stockcharts.com tutorial (14 period)
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28,
    46.28, 46.0, 46.03, 46.41, 46.22, 45.64, 46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18,
    44.22, 44.57, 43.42, 42.66, 43.13,
  ];
  // their spreadsheet rounds the intermediate averages to 2 decimals,
  // so we allow a small difference (< 0.1)
  it("matches the textbook values", () => {
    const r = rsi(closes, 14);
    const expected = { 14: 70.53, 15: 66.32, 16: 66.55, 20: 62.93, 26: 39.99, 32: 37.77 };
    expect(r[13]).toBeNull();
    for (const [i, v] of Object.entries(expected)) {
      expect(Math.abs(r[i] - v)).toBeLessThan(0.1);
    }
  });
  it("is 100 when price only goes up and 0 when only down", () => {
    const up = Array.from({ length: 20 }, (_, i) => 100 + i);
    const down = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(rsi(up)[19]).toBe(100);
    expect(rsi(down)[19]).toBe(0);
  });
  it("stays between 0 and 100", () => {
    const vals = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 3) * 10 + (i % 7));
    for (const v of rsi(vals)) if (v != null) expect(v >= 0 && v <= 100).toBe(true);
  });
});

describe("macd", () => {
  it("histogram = line - signal", () => {
    const vals = Array.from({ length: 80 }, (_, i) => 100 + i * 0.5 + Math.sin(i));
    const m = macd(vals);
    const i = 79;
    expect(m.hist[i]).toBeCloseTo(m.line[i] - m.signal[i]);
    expect(m.signal[30]).toBeNull();
  });
});

describe("misc", () => {
  it("pctChange", () => {
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(5, 0)).toBe(0);
  });
  it("volatility of a flat series is 0", () => {
    expect(annualVolatility([100, 100, 100, 100])).toBe(0);
  });
  it("summary needs 60 closes", () => {
    expect(technicalSummary([1, 2, 3])).toBeNull();
    const up = Array.from({ length: 80 }, (_, i) => 100 + i);
    expect(technicalSummary(up).trend).toBe("Bullish");
  });
});
