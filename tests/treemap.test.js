import { describe, it, expect } from "vitest";
import { squarify, nestedTreemap } from "../src/lib/treemap.js";

describe("squarify", () => {
  const items = [6, 6, 4, 3, 2, 2, 1].map((v, i) => ({ id: i, value: v }));
  const out = squarify(items, 0, 0, 600, 400);

  it("keeps every item and areas proportional to value", () => {
    expect(out).toHaveLength(7);
    const total = 24;
    for (const r of out) expect(r.w * r.h).toBeCloseTo((r.value / total) * 600 * 400, 3);
  });
  it("stays inside the rectangle", () => {
    for (const r of out) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(600 + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(400 + 1e-6);
    }
  });
  it("tiles don't overlap", () => {
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(ox <= 1e-6 || oy <= 1e-6).toBe(true);
      }
  });
  it("skips zero values", () => {
    expect(squarify([{ value: 0 }, { value: 2 }], 0, 0, 10, 10)).toHaveLength(1);
  });
});

describe("nested", () => {
  it("lays out children inside their group", () => {
    const groups = [
      { name: "A", children: [{ value: 3 }, { value: 1 }] },
      { name: "B", children: [{ value: 2 }] },
    ];
    const out = nestedTreemap(groups, 300, 200, 2, 0);
    for (const g of out) for (const c of g.children) {
      expect(c.x).toBeGreaterThanOrEqual(g.x);
      expect(c.x + c.w).toBeLessThanOrEqual(g.x + g.w + 1e-6);
    }
  });
});
