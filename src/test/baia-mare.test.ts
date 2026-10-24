import { describe, expect, it } from "vitest";
import { HISTORY_ALERT_H, POINTS, leadHours, plumeFront } from "@/data/baia-mare-2000";

// Pins the documented 2000 timeline (Hungarian evaluation, Feb 2000) and the scenario arithmetic.
describe("Baia Mare 2000 case study", () => {
  const csenger = POINTS.find((p) => p.id === "csenger")!;

  it("dates the border crossing and the formal alarm as documented", () => {
    expect(csenger.arrival_h).toBe(42);
    expect(csenger.peak_mg_l).toBe(32.6);
    expect(HISTORY_ALERT_H).toBeCloseTo(22.92, 2);
  });

  it("turns 19 h of warning at the border into about 1.6 days", () => {
    expect(leadHours(csenger, "history")).toBe(19.1);
    expect(leadHours(csenger, "pelanode")).toBe(39.5);
  });

  it("moves the plume front downstream and stops at the last documented point", () => {
    const a = plumeFront(42).path.length;
    const b = plumeFront(212).path.length;
    expect(b).toBeGreaterThan(a);
    expect(plumeFront(330).dated).toBe(false);
    expect(plumeFront(330).path.length).toBe(plumeFront(300).path.length);
  });
});
