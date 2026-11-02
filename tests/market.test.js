import { describe, it, expect } from "vitest";
import { marketStatus, sessionFor, nextOpen, istParts } from "../shared/market.js";

// helper: build a Date from an IST wall clock time
const ist = (s) => new Date(s + "+05:30");

describe("market status", () => {
  it("is open on a normal weekday afternoon", () => {
    expect(marketStatus(ist("2026-11-02T11:00:00")).state).toBe("open");
  });
  it("pre-open between 9:00 and 9:15", () => {
    expect(marketStatus(ist("2026-11-02T09:05:00")).state).toBe("pre-open");
  });
  it("closes at 15:30 sharp", () => {
    expect(marketStatus(ist("2026-11-02T15:29:00")).state).toBe("open");
    expect(marketStatus(ist("2026-11-02T15:30:00")).state).toBe("closed");
  });
  it("is closed on weekends", () => {
    const s = marketStatus(ist("2026-11-07T11:00:00"));
    expect(s.state).toBe("closed");
    expect(s.reason).toBe("Weekend");
  });
  it("knows NSE holidays", () => {
    const s = marketStatus(ist("2026-11-10T11:00:00"));
    expect(s.state).toBe("closed");
    expect(s.reason).toMatch(/Balipratipada/);
  });
  it("handles the sunday muhurat session", () => {
    expect(sessionFor("2026-11-08").name).toBe("Muhurat trading");
    expect(marketStatus(ist("2026-11-08T14:30:00")).state).toBe("open");
    expect(marketStatus(ist("2026-11-08T11:00:00")).state).toBe("closed");
  });
  it("next open skips weekend + holiday", () => {
    // friday evening -> sunday muhurat 14:20
    expect(nextOpen(ist("2026-11-06T18:00:00")).toISOString()).toBe(ist("2026-11-08T14:20:00").toISOString());
    // monday 9 nov evening -> 10th is a holiday -> wednesday 11th
    expect(nextOpen(ist("2026-11-09T18:00:00")).toISOString()).toBe(ist("2026-11-11T09:15:00").toISOString());
  });
  it("ist conversion works across UTC midnight", () => {
    const p = istParts(new Date("2026-11-02T20:00:00Z"));
    expect(p.date).toBe("2026-11-03");
    expect(p.minutes).toBe(90);
  });
});
