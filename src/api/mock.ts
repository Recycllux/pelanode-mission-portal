import type { PelaApi } from "./client";
import {
  DATASETS,
  END_MS,
  MIN,
  START_MS,
  buildContextRecords,
  buildEvents,
  buildMission,
  buildTrack,
  haversineKm,
} from "./mock-data";
import type {
  Event,
  EventSummary,
  ExportFormat,
  ReplayCommand,
  ReplayState,
  ReplayStatus,
  ReviewRequest,
  TrackPoint,
} from "./types";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Latest snapshot date at or before `date` (ISO yyyy-mm-dd), else the earliest one. */
export function snapshotKey(keys: string[], date: string): string {
  const sorted = [...keys].sort();
  let pick = sorted[0]!;
  for (const k of sorted) if (k <= date.slice(0, 10)) pick = k;
  return pick;
}
const wait = (ms = 40) => new Promise((r) => setTimeout(r, ms));

export function toSummary(e: Event): EventSummary {
  return {
    event_id: e.event_id,
    mission_id: e.mission_id,
    event_type: e.event_type,
    perspective: e.perspective,
    captured_at: e.captured_at,
    position: e.position,
    confidence: e.model_output.confidence,
    quality_score: e.observation.quality_score,
    attention: e.attention,
    review: e.review,
    data_origin: e.data_origin,
  };
}

/** In-memory API with a simulated replay clock. `now` is injectable for tests. */
export class MockApi implements PelaApi {
  readonly kind = "mock" as const;
  private track!: TrackPoint[];
  private events!: Event[];
  private records = buildContextRecords();
  private seenRequests = new Set<string>();
  private replay!: { state: ReplayState; missionMs: number; anchorReal: number; speed: number; started_at: string | null };

  constructor(private now: () => number = () => Date.now(), private latency = 40) {
    this.reset();
  }

  private reset() {
    this.track = buildTrack();
    this.events = buildEvents(this.track, this.records);
    this.seenRequests.clear();
    this.replay = { state: "idle", missionMs: START_MS, anchorReal: this.now(), speed: 100, started_at: null };
  }

  private fold() {
    const r = this.replay;
    if (r.state === "running") {
      const t = r.missionMs + (this.now() - r.anchorReal) * r.speed;
      r.anchorReal = this.now();
      if (t >= END_MS) {
        r.missionMs = END_MS;
        r.state = "ended";
      } else r.missionMs = t;
    }
  }

  private missionMs() {
    this.fold();
    return this.replay.missionMs;
  }

  private status(): ReplayStatus {
    this.fold();
    const r = this.replay;
    return { state: r.state, mission_time: new Date(r.missionMs).toISOString(), speed: r.speed, started_at: r.started_at };
  }

  private visibleEvents(untilMs: number) {
    return this.events.filter((e) => Date.parse(e.captured_at) <= untilMs);
  }

  private delay() {
    return this.latency ? wait(this.latency) : Promise.resolve();
  }

  async getMission(id: string) {
    await this.delay();
    const t = this.missionMs();
    const ev = this.visibleEvents(t);
    const elapsedMin = Math.floor((t - START_MS) / MIN);
    return {
      ...buildMission(this.track),
      mission_id: id,
      counts: {
        observations: (elapsedMin + 1) * 2,
        events: ev.length,
        review_required: ev.filter((e) => e.attention === "review_required" && e.review.status === "unreviewed").length,
        reviewed: ev.filter((e) => e.review.status !== "unreviewed").length,
      },
    };
  }

  async getTrack(_id: string, until: string) {
    await this.delay();
    const u = Math.min(Date.parse(until), this.missionMs());
    return clone(this.track.filter((p) => Date.parse(p.captured_at) <= u));
  }

  async listEvents(_missionId: string, until: string) {
    await this.delay();
    const u = Math.min(Date.parse(until), this.missionMs());
    return clone(this.visibleEvents(u).map(toSummary));
  }

  async getEvent(id: string) {
    await this.delay();
    const e = this.events.find((x) => x.event_id === id);
    if (!e || Date.parse(e.captured_at) > this.missionMs()) throw new Error(`Event ${id} not available yet`);
    return clone(e);
  }

  async reviewEvent(id: string, body: ReviewRequest) {
    await this.delay();
    const e = this.events.find((x) => x.event_id === id);
    if (!e) throw new Error(`Event ${id} not found`);
    if (!this.seenRequests.has(body.request_id)) {
      this.seenRequests.add(body.request_id);
      // reject -> dismissed; leave_open keeps the current status (event stays open).
      const status = body.action === "confirm" ? "confirmed" : body.action === "reject" ? "dismissed" : body.action === "relabel" ? "relabelled" : e.review.status;
      e.review = {
        status,
        current_label: body.action === "relabel" ? (body.new_label ?? null) : body.action === "confirm" ? e.model_output.class : body.action === "leave_open" ? e.review.current_label : null,
        last_action: body.action,
        by: body.reviewer,
        at: new Date(this.now()).toISOString(),
        mission_time: new Date(this.missionMs()).toISOString(),
        note: body.note ?? null,
      };
    }
    return clone({ review: e.review, event: e });
  }

  async getContext(_id?: string) {
    await this.delay();
    return clone({ datasets: DATASETS, records: this.records });
  }

  async getNodeStatus(_nodeId?: string, _missionId?: string) {
    await this.delay();
    const min = (this.missionMs() - START_MS) / MIN;
    return {
      battery_pct: Math.round(88 - min * 0.15),
      connectivity: "online" as const,
      gnss_status: "fix" as const,
      surface_camera: "ok" as const,
      underwater_camera: "ok" as const,
      storage_pct: Math.round(38 + min * 0.1),
    };
  }

  async getReplay(_id?: string) {
    await this.delay(); 
    return this.status();
  }

  async controlReplay(_id: string, cmd: ReplayCommand) {
    await this.delay();
    this.fold();
    const r = this.replay;
    const now = this.now();
    switch (cmd.action) {
      case "start":
        r.missionMs = START_MS;
        r.state = "running";
        r.anchorReal = now;
        r.started_at = new Date(now).toISOString();
        if (cmd.speed) r.speed = cmd.speed;
        break;
      case "pause":
        if (r.state === "running") r.state = "paused";
        break;
      case "resume":
        if (r.state === "paused") {
          r.state = "running";
          r.anchorReal = now;
        }
        break;
      case "seek": {
        const to = Math.max(START_MS, Math.min(END_MS, Date.parse(cmd.to ?? "")));
        if (Number.isNaN(to)) break;
        r.missionMs = to;
        r.anchorReal = now;
        if (r.state === "idle" || (r.state === "ended" && to < END_MS)) r.state = "paused";
        if (to >= END_MS) r.state = "ended";
        break;
      }
      case "speed":
        if (cmd.speed && cmd.speed > 0) {
          r.speed = cmd.speed;
          r.anchorReal = now;
        }
        break;
    }
    return this.status();
  }

  async getReport(id: string) {
    await this.delay();
    const t = this.missionMs();
    const m = await this.getMission(id);
    const tr = this.track.filter((p) => Date.parse(p.captured_at) <= t);
    let km = 0;
    for (let i = 1; i < tr.length; i++) km += haversineKm(tr[i - 1]!.lat, tr[i - 1]!.lon, tr[i]!.lat, tr[i]!.lon);
    return {
      mission_id: id,
      name: m.name,
      period_start: m.planned_start,
      period_end: m.planned_end,
      until: new Date(t).toISOString(),
      ...m.counts,
      path_length_km: +km.toFixed(2),
      data_origin: m.data_origin,
      model_versions: ["pn-det 0.1 (simulated inference)"],
      datasets: DATASETS.map((d) => ({ dataset_id: d.dataset_id, provider: d.provider, provenance: d.provenance })),
      generated_at: new Date(this.now()).toISOString(),
    };
  }

  async exportReport(_id: string, format: ExportFormat) {
    await this.delay();
    if (format === "html") return { file_uri: "/reports/print" };
    const t = this.missionMs();
    const ev = this.visibleEvents(t);
    const tr = this.track.filter((p) => Date.parse(p.captured_at) <= t);
    let content = "";
    let type = "application/json";
    if (format === "csv") {
      type = "text/csv";
      const head = "event_id,captured_at,perspective,class,confidence,quality_score,lat,lon,attention,review_status,current_label,data_origin,inference_origin";
      content = [head, ...ev.map((e) => [e.event_id, e.captured_at, e.perspective, e.model_output.class, e.model_output.confidence, e.observation.quality_score, e.position.lat, e.position.lon, e.attention, e.review.status, e.review.current_label ?? "", e.data_origin, e.model_output.inference_origin].join(","))].join("\n");
    } else if (format === "geojson") {
      type = "application/geo+json";
      content = JSON.stringify({
        type: "FeatureCollection",
        properties: { mission_id: "HACK-001", data_origin: "simulated" },
        features: [
          { type: "Feature", properties: { kind: "track" }, geometry: { type: "LineString", coordinates: tr.map((p) => [p.lon, p.lat]) } },
          ...ev.map((e) => ({ type: "Feature", properties: { kind: "event", ...toSummary(e), position: undefined }, geometry: { type: "Point", coordinates: [e.position.lon, e.position.lat] } })),
        ],
      }, null, 2);
    } else {
      content = JSON.stringify({ data_origin: "simulated", track: tr, events: ev }, null, 2);
    }
    const blob = new Blob([content], { type });
    return { file_uri: URL.createObjectURL(blob) };
  }

  async resetDemo(_missionId?: string) {
    await this.delay();
    this.reset();
  }

  /** Danube data is a snapshot of the real backend, loaded on first use so it stays out of the main bundle. */
  async getDanubeForecast(_missionId: string, asOf: string) {
    const { DANUBE_FORECASTS } = await import("./mock-danube");
    return clone(DANUBE_FORECASTS[snapshotKey(Object.keys(DANUBE_FORECASTS), asOf)]!);
  }

  async getDanubeProfile(date: string) {
    const { DANUBE_PROFILES } = await import("./mock-danube");
    return clone(DANUBE_PROFILES[snapshotKey(Object.keys(DANUBE_PROFILES), date)]!);
  }

  async getDanubeSeries(stationId: string) {
    const { DANUBE_SERIES, DANUBE_SERIES_BY_STATION } = await import("./mock-danube");
    return clone(DANUBE_SERIES_BY_STATION[stationId.toUpperCase()] ?? DANUBE_SERIES);
  }

  async getDanubeBacktest(_stationId: string) {
    const { DANUBE_BACKTEST } = await import("./mock-danube");
    return clone(DANUBE_BACKTEST);
  }

  /** Snapshot taken along the mock track on 2021-10-01: serves the nearest one, echoing the requested position. */
  async getDanubePoint(lat: number, lon: number, _asOf: string) {
    const { DANUBE_POINTS } = await import("./mock-danube");
    const nearest = Object.values(DANUBE_POINTS).reduce((a, b) => (haversineKm(lat, lon, a.lat, a.lon) <= haversineKm(lat, lon, b.lat, b.lon) ? a : b));
    return { ...clone(nearest), lat, lon };
  }

  async getDanubeStations() {
    const { DANUBE_STATIONS } = await import("./mock-danube");
    return clone(DANUBE_STATIONS);
  }

  async getDanubeLags(source?: string) {
    const { DANUBE_LAGS, DANUBE_LAGS_BY_SOURCE } = await import("./mock-danube");
    const view = source ? DANUBE_LAGS_BY_SOURCE[source.toUpperCase()] : DANUBE_LAGS;
    if (!view) throw new Error(`GET /danube/lags failed (422)`);
    return clone(view);
  }

  async getDanubeAnomalies() {
    const { DANUBE_ANOMALIES } = await import("./mock-danube");
    return clone(DANUBE_ANOMALIES);
  }

  async getScenarioDatasets() {
    const { SCENARIO_DATASETS } = await import("./mock-danube");
    return clone(SCENARIO_DATASETS);
  }

  async getIskarSeries() {
    const { ISKAR_SERIES } = await import("./mock-danube");
    return clone(ISKAR_SERIES);
  }

  /** Same rules as the backend: inside the shared window and on a day with a value; the handoff does not depend on the day. */
  async createIskarEvent(stationId: string, scenarioDate: string) {
    const { ISKAR_EVENTS, ISKAR_SERIES } = await import("./mock-danube");
    const { from, to } = ISKAR_SERIES.shared_window;
    const st = ISKAR_SERIES.stations.find((s) => s.station.station_id === stationId);
    const row = st?.series.find((r) => r.date === scenarioDate);
    if (!from || !to || scenarioDate < from || scenarioDate > to || !row) throw new Error(`POST /scenario/tributaries/iskar/event failed (422)`);
    const prev = st!.series.find((r) => r.date === shiftDay(scenarioDate, -1));
    const ev = clone(Object.values(ISKAR_EVENTS)[0]!);
    ev.event_id = `tie_ISKAR_${stationId}_${scenarioDate}`;
    ev.observation = {
      ...ev.observation,
      station_id: stationId,
      source_date: scenarioDate,
      scenario_date: scenarioDate,
      discharge_m3s: Math.round(row.discharge_m3s * 10) / 10,
      change_24h_m3s: prev ? Math.round((row.discharge_m3s - prev.discharge_m3s) * 10) / 10 : null,
    };
    return ev;
  }

  mediaUrl() {
    return null; // No real frames in the mock: always render the labelled placeholder.
  }

  fileUrl(uri: string) {
    return uri;
  }
}

function shiftDay(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
