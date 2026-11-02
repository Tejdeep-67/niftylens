import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import model from "../shared/sentiment-model.js";
import { createScorer, tokenize, aggregate, moodLabel } from "../shared/sentiment.js";

const scorer = createScorer(model);
const cases = JSON.parse(readFileSync(new URL("../ml/results/parity_cases.json", import.meta.url)));

describe("tokenizer", () => {
  it("lowercases, drops urls/cashtags and replaces numbers", () => {
    expect(tokenize("$TCS up 5% https://t.co/x")).toEqual(["up", "num", "pct", "up num", "num pct"]);
  });
});

describe("JS model matches the python model", () => {
  it(`same probabilities on ${cases.length} test sentences`, () => {
    let maxDiff = 0;
    for (const c of cases) {
      const p = scorer.predict(c.text).probs;
      for (let i = 0; i < 3; i++) maxDiff = Math.max(maxDiff, Math.abs(p[i] - c.probs[i]));
    }
    // weights are rounded to 4 decimals in the export, so allow a tiny difference
    expect(maxDiff).toBeLessThan(0.005);
  });
});

describe("predictions make sense", () => {
  it("obvious headlines", () => {
    expect(scorer.predict("Sensex crashes as FII selling continues, investors lose Rs 5 lakh crore").label).toBe("negative");
    expect(scorer.predict("Infosys profit rises 12%, beats estimates").label).toBe("positive");
  });
  it("explain returns the strongest words", () => {
    const ex = scorer.explain("Net profit fell sharply due to weak demand");
    expect(ex.length).toBeGreaterThan(0);
    expect(ex[0].value).toBeLessThan(0);
  });
});

describe("aggregate", () => {
  it("weights recent headlines more", () => {
    const now = Date.parse("2026-11-02T12:00:00Z");
    const items = [
      { label: "positive", score: 1, published: "2026-11-02T11:00:00Z" },
      { label: "negative", score: -1, published: "2026-10-26T11:00:00Z" },
    ];
    const a = aggregate(items, now);
    expect(a.score).toBeGreaterThan(0.8);
    expect(a.counts.positive).toBe(1);
  });
  it("mood labels", () => {
    expect(moodLabel(0.4)).toBe("Bullish");
    expect(moodLabel(0)).toBe("Neutral");
    expect(moodLabel(-0.3)).toBe("Bearish");
  });
});
