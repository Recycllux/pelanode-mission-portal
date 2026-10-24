import { describe, expect, it } from "vitest";
import { MockApi } from "@/api/mock";
import { stationName, windowText } from "@/lib/pn-format";

// The mock is a snapshot of the real backend: these pin the demo numbers of P0-19 v1.3.
describe("River intelligence (mock snapshot)", () => {
  const api = new MockApi();

  it("serves the verified windows from Calafat", async () => {
    const lags = await api.getDanubeLags("CALAFAT");
    const giurgiu = lags.edges.find((e) => e.to_station === "GIURGIU")!;
    expect(giurgiu.optimal_lag_days_level).toBe(3);
    expect(giurgiu.optimal_lag_days_delta_h).toBe(2);
    expect(windowText(giurgiu.monitoring_window_days)).toBe("~2–3 days");
    expect(lags.note).toContain("not a pollutant travel time");
  });

  it("keeps Gorni Vadin primary and Kozloduy neighbour-influenced on 30 Oct", async () => {
    const a = await api.getDanubeAnomalies();
    const day = a.candidates.filter((c) => c.observation.date === "2021-10-30");
    expect(day.find((c) => c.observation.station_id === "GORNI_VADIN")!.model_output.role).toBe("primary");
    expect(day.find((c) => c.observation.station_id === "KOZLODUY")!.model_output.role).toBe("neighbour_influenced");
  });

  it("hands off the Iskar input only inside the shared window", async () => {
    const ev = await api.createIskarEvent("OREHOVITSA", "2025-11-06");
    expect(ev.claim_scope).toBe("scenario_aligned");
    expect(ev.observation.discharge_m3s).toBe(33.2);
    expect(ev.handoff.map((h) => h.gauge)).toEqual(["CORABIA", "ZAGRAZHDEN"]);
    await expect(api.createIskarEvent("OREHOVITSA", "2025-11-29")).rejects.toThrow("422");
  });

  it("formats windows and station names", () => {
    expect(windowText({ min: 0, max: 0 })).toBe("same day");
    expect(windowText({ min: 1, max: 1 })).toBe("~1 day");
    expect(windowText({ min: 0, max: 1 })).toBe("same day–1 day");
    expect(windowText(null)).toBe("not shown");
    expect(stationName("TURNU_MAGURELE")).toBe("Turnu Magurele");
  });
});
