import { describe, it, expect } from "vitest";
import { evaluate, conditionMet } from "../src/lib/alerts.js";

const q = (price, changePct = 0) => ({ price, changePct });

describe("alert conditions", () => {
  it("price above / below", () => {
    expect(conditionMet({ type: "above", value: 100 }, q(101))).toBe(true);
    expect(conditionMet({ type: "above", value: 100 }, q(99))).toBe(false);
    expect(conditionMet({ type: "below", value: 100 }, q(99))).toBe(true);
  });
  it("percent moves", () => {
    expect(conditionMet({ type: "moveUp", value: 2 }, q(1, 2.5))).toBe(true);
    expect(conditionMet({ type: "moveDown", value: 2 }, q(1, -2.5))).toBe(true);
    expect(conditionMet({ type: "moveDown", value: 2 }, q(1, -1))).toBe(false);
  });
  it("sentiment needs at least 3 headlines", () => {
    expect(conditionMet({ type: "sentimentNeg", value: 0.1 }, null, { score: -0.5, n: 2 })).toBe(false);
    expect(conditionMet({ type: "sentimentNeg", value: 0.1 }, null, { score: -0.5, n: 5 })).toBe(true);
  });
});

describe("edge triggering", () => {
  const rule = { id: 1, symbol: "TCS", type: "above", value: 100, enabled: true };

  it("fires once, then waits until the condition resets", () => {
    let r = evaluate([rule], { TCS: q(101) });
    expect(r.fired).toHaveLength(1);
    r = evaluate(r.rules, { TCS: q(102) });
    expect(r.fired).toHaveLength(0);
    r = evaluate(r.rules, { TCS: q(99) }); // re-arms
    expect(r.fired).toHaveLength(0);
    r = evaluate(r.rules, { TCS: q(101) });
    expect(r.fired).toHaveLength(1);
  });

  it("ignores disabled rules and missing quotes", () => {
    expect(evaluate([{ ...rule, enabled: false }], { TCS: q(500) }).fired).toHaveLength(0);
    expect(evaluate([rule], {}).fired).toHaveLength(0);
  });

  it("message mentions the stock", () => {
    const r = evaluate([{ ...rule, type: "moveDown", value: 3 }], { TCS: q(90, -4.2) });
    expect(r.fired[0].message).toMatch(/TCS is down 4.20%/);
  });
});
