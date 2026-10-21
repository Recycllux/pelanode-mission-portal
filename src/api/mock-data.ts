import type { ContextDataset, ContextRecord, Event, Mission, TrackPoint } from "./types";

export const MISSION_ID = "HACK-001";
export const NODE_ID = "PN-MVP-001";
export const MISSION_START = "2026-10-24T14:22:00.000Z";
export const MISSION_END = "2026-10-24T15:04:00.000Z";
export const START_MS = Date.parse(MISSION_START);
export const END_MS = Date.parse(MISSION_END);
export const MIN = 60_000;

const START_LAT = 43.899;
const START_LON = 25.92;
// ~1.7 km eastward at 43.9°N: 1° lon ≈ 80.2 km
const TOTAL_DLON = 1.7 / 80.2;

export function buildTrack(): TrackPoint[] {
  const pts: TrackPoint[] = [];
  for (let i = 0; i < 43; i++) {
    const f = i / 42;
    const lat = START_LAT + 0.0011 * Math.sin(f * Math.PI * 1.3) + 0.0004 * f;
    const lon = START_LON + TOTAL_DLON * (f + 0.03 * Math.sin(f * Math.PI * 2));
    pts.push({
      mission_id: MISSION_ID,
      t: new Date(START_MS + i * MIN).toISOString(),
      lat: +lat.toFixed(6),
      lon: +lon.toFixed(6),
      heading_deg: 0,
      speed_mps: 0,
      h_acc_m: 2.5 + 0.5 * Math.sin(i),
      source: "replayed",
    });
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[Math.min(i + 1, pts.length - 1)]!;
    const p = i === pts.length - 1 ? pts[i - 1]! : a;
    const q = i === pts.length - 1 ? a : b;
    const dy = q.lat - p.lat;
    const dx = (q.lon - p.lon) * Math.cos((q.lat * Math.PI) / 180);
    a.heading_deg = +(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360).toFixed(1);
    a.speed_mps = +((haversineKm(p.lat, p.lon, q.lat, q.lon) * 1000) / 60).toFixed(2);
  }
  return pts;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const DATASETS: ContextDataset[] = [
  {
    dataset_id: "sim_hydro_discharge",
    provider: "Simulated (NIMH-style)",
    variable: "discharge",
    unit: "m3/s",
    station_name: "Simulated station 1",
    lat: 43.912,
    lon: 25.795,
    provenance: "simulated",
    label: "SIMULATED CONTEXT",
  },
  {
    dataset_id: "sim_hydro_level",
    provider: "Simulated (NIMH-style)",
    variable: "water_level",
    unit: "m",
    station_name: "Simulated station 2",
    lat: 43.884,
    lon: 25.98,
    provenance: "simulated",
    label: "SIMULATED CONTEXT",
  },
];

const DISCHARGE = [820, 850, 895, 955, 1030, 1100, 1173, 1256];
const LEVEL = [4.1, 4.22, 4.38, 4.58, 4.8, 5.02, 5.2, 5.36];
const SERIES_START = Date.parse("2026-10-24T08:22:00.000Z");

export function buildContextRecords(): ContextRecord[] {
  const out: ContextRecord[] = [];
  for (let h = 0; h < 8; h++) {
    const observed_at = new Date(SERIES_START + h * 60 * MIN).toISOString();
    out.push({
      dataset_id: "sim_hydro_discharge",
      variable: "discharge",
      value: DISCHARGE[h]!,
      unit: "m3/s",
      observed_at,
      station_name: "Simulated station 1",
      provenance: "simulated",
    });
    out.push({
      dataset_id: "sim_hydro_level",
      variable: "water_level",
      value: LEVEL[h]!,
      unit: "m",
      observed_at,
      station_name: "Simulated station 2",
      provenance: "simulated",
    });
  }
  return out;
}

export function buildMission(): Omit<Mission, "counts"> {
  return {
    mission_id: MISSION_ID,
    name: "Danube high-flow reconnaissance",
    mode: "drift",
    start_time: MISSION_START,
    end_time: MISSION_END,
    data_origin: "simulated",
    river: "Lower Danube (synthetic)",
    node: { node_id: NODE_ID, name: "PelaNode MVP 001", model: "PelaNode MVP" },
  };
}

interface EventSeed {
  n: string;
  minute: number;
  perspective: "above" | "below";
  cls: string;
  confidence: number;
  frame: string;
  quality: number;
  flags?: string[];
  attention: "review_required" | "none";
  reasons: string[];
  bbox: [number, number, number, number];
}

const SEEDS: EventSeed[] = [
  { n: "0142", minute: 10, perspective: "above", cls: "anthropogenic_debris", confidence: 0.93, frame: "SURF-003210", quality: 0.84, attention: "review_required", reasons: ["score_above_threshold"], bbox: [412, 288, 96, 64] },
  { n: "0143", minute: 15, perspective: "below", cls: "submerged_debris", confidence: 0.82, frame: "UW-003892", quality: 0.71, attention: "none", reasons: [], bbox: [560, 340, 140, 90] },
  { n: "0144", minute: 19, perspective: "below", cls: "surface_anomaly", confidence: 0.76, frame: "UW-004130", quality: 0.42, flags: ["low_visibility"], attention: "review_required", reasons: ["low_visibility", "score_above_threshold"], bbox: [300, 200, 220, 150] },
  { n: "0145", minute: 30, perspective: "above", cls: "floating_vegetation", confidence: 0.54, frame: "SURF-004890", quality: 0.78, attention: "none", reasons: [], bbox: [700, 260, 120, 70] },
];

export function buildEvents(track: TrackPoint[], records: ContextRecord[]): Event[] {
  return SEEDS.map((s) => {
    const p = track[s.minute]!;
    const captured = START_MS + s.minute * MIN;
    const isAbove = s.perspective === "above";
    const context = DATASETS.map((ds) => {
      const rec = records
        .filter((r) => r.dataset_id === ds.dataset_id && Date.parse(r.observed_at) <= captured)
        .at(-1)!;
      return {
        dataset_id: ds.dataset_id,
        provider: ds.provider,
        variable: ds.variable,
        value: rec.value,
        unit: rec.unit,
        observed_at: rec.observed_at,
        station_name: ds.station_name,
        distance_km: +haversineKm(ds.lat, ds.lon, p.lat, p.lon).toFixed(1),
        time_offset_min: Math.round((Date.parse(rec.observed_at) - captured) / MIN),
        relation: "coincides_with" as const,
        provenance: ds.provenance,
      };
    });
    return {
      event_id: `EV-${s.n}`,
      mission_id: MISSION_ID,
      node_id: NODE_ID,
      event_type: s.cls,
      perspective: s.perspective,
      captured_at: new Date(captured).toISOString(),
      position: { lat: p.lat, lon: p.lon, h_acc_m: 3.0, source: "replayed" },
      observation: {
        observation_id: `OBS-HACK-001-${isAbove ? "S" : "U"}-${s.n}`,
        source_sensor: isAbove ? "camera_surface" : "camera_underwater",
        paired_observation_id: `OBS-HACK-001-${isAbove ? "U" : "S"}-${s.n}`,
        evidence: {
          frame_uri: `/media/${isAbove ? "surface" : "underwater"}/${s.frame}.jpg`,
          thumb_uri: null,
          crop_uri: null,
          provenance: "placeholder",
        },
        quality_score: s.quality,
        quality_flags: s.flags ?? [],
      },
      model_output: {
        model_output_id: `MO-HACK-001-${s.n}`,
        class: s.cls,
        confidence: s.confidence,
        bbox: s.bbox,
        model_id: "pn-det",
        model_version: "0.1",
        inference_origin: "simulated",
      },
      context,
      attention: s.attention,
      attention_reasons: s.reasons,
      review: { status: "unreviewed", current_label: null, last_action: null, by: null, at: null, note: null },
      data_origin: "replayed",
      device: { battery_pct: 88 - Math.round(s.minute * 0.15), connectivity: "online", storage_pct: 38 + Math.round(s.minute * 0.1) },
    };
  });
}
