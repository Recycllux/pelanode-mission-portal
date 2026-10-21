import { describe, expect, it } from "vitest";
import { MockApi } from "@/api/mock";

const M = "HACK-001";
const FAR = "2030-01-01T00:00:00.000Z";

function setup() {
  let now = 1_000_000;
  const api = new MockApi(() => now, 0);
  return { api, advance: (ms: number) => (now += ms) };
}

describe("MockApi replay", () => {
  it("demo speed (100x) plays the 42-minute mission in about 25 s", async () => {
    const { api, advance } = setup();
    await api.controlReplay(M, { action: "start" });
    advance(25_000);
    expect((await api.getReplay(M)).state).toBe("running");
    advance(500);
    const r = await api.getReplay(M);
    expect(r.state).toBe("ended");
    expect(r.mission_time).toBe("2026-10-24T15:04:00.000Z");
  });

  it("track has 43 points once the mission has ended", async () => {
    const { api, advance } = setup();
    await api.controlReplay(M, { action: "start" });
    advance(30_000);
    expect(await api.getTrack(M, FAR)).toHaveLength(43);
  });

  it("only shows data at or before mission time", async () => {
    const { api } = setup();
    await api.controlReplay(M, { action: "seek", to: "2026-10-24T14:37:00.000Z" });
    const ids = (await api.listEvents(M, FAR)).map((e) => e.event_id);
    expect(ids).toEqual(["EV-0142", "EV-0143"]);
  });

  it("EV-0143 context coincides with discharge of 1173 m3/s", async () => {
    const { api } = setup();
    await api.controlReplay(M, { action: "seek", to: "2026-10-24T15:04:00.000Z" });
    const e = await api.getEvent("EV-0143");
    const q = e.context.find((c) => c.variable === "discharge")!;
    expect(q.value).toBe(1173);
    expect(q.relation).toBe("coincides_with");
  });

  it("confirming keeps the original model output", async () => {
    const { api } = setup();
    await api.controlReplay(M, { action: "seek", to: "2026-10-24T15:04:00.000Z" });
    const e = await api.reviewEvent("EV-0143", { action: "confirm", reviewer: "t", request_id: "r1" });
    expect(e.review.status).toBe("confirmed");
    expect(e.model_output.class).toBe("submerged_debris");
    expect(e.model_output.confidence).toBe(0.82);
  });
});
