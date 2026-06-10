import { describe, it, expect } from "vitest";
import { formatPeriod, defaultPeriod, statusLabel, statusKind } from "../reports";

describe("reports lib", () => {
  it("formatPeriod returns ro-RO formatted range", () => {
    const out = formatPeriod("2025-01-01", "2025-01-31");
    expect(out).toContain("ian.");
    expect(out).toContain("2025");
    expect(out).toContain("–");
  });

  it("defaultPeriod covers the previous full calendar month", () => {
    const { period_start, period_end } = defaultPeriod();
    const s = new Date(period_start);
    const e = new Date(period_end);
    expect(s.getDate()).toBe(1);
    // end date is last day of its month
    const next = new Date(e.getFullYear(), e.getMonth() + 1, 1);
    const lastDay = new Date(next.getTime() - 86400000).getDate();
    expect(e.getDate()).toBe(lastDay);
    // start month is exactly one before end month
    const monthsDiff = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    expect(monthsDiff).toBe(0);
  });

  it("statusLabel maps known statuses to Romanian labels", () => {
    expect(statusLabel("draft")).toBe("Schiță");
    expect(statusLabel("ready")).toBe("Gata");
    expect(statusLabel("sent")).toBe("Trimis");
    expect(statusLabel("unknown")).toBe("unknown");
  });

  it("statusKind maps statuses to pill kinds", () => {
    expect(statusKind("ready")).toBe("success");
    expect(statusKind("sent")).toBe("info");
    expect(statusKind("draft")).toBe("muted");
  });
});
