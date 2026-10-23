// All API types. Field names mirror the Spring Boot API contract (snake_case).

export type DataOrigin = "live" | "recorded" | "replayed" | "simulated";
export type Provenance = "simulated" | "replayed" | "recorded" | "placeholder" | "organiser" | "measured" | "live";
export type Perspective = "above" | "below";
export type ReviewStatus = "unreviewed" | "confirmed" | "relabelled" | "dismissed";
/** reject -> status "dismissed"; leave_open keeps the event unreviewed. */
export type ReviewAction = "confirm" | "reject" | "relabel" | "leave_open";
export type Attention = "review_required" | "informational";
export type ContextRelation = "coincides_with" | "upstream_of" | "downstream_of" | "near";
export type TrackSource = "gnss" | "simulated" | "replayed" | "interpolated";
export type TrackQuality = "ok" | "degraded" | "demo_only" | "interpolated";
export type GnssStatus = "fix" | "degraded" | "no_fix";
export type CameraStatus = "ok" | "degraded" | "unavailable";
export type MissionMode = "drift" | "moored" | "tethered";
export type Connectivity = "online" | "degraded" | "offline";
export type ReplayState = "idle" | "running" | "paused" | "ended";
export type ExportFormat = "csv" | "geojson" | "json" | "html";

export interface Position {
  lat: number;
  lon: number;
  h_acc_m: number;
  source: Provenance;
}

export interface MissionCounts {
  observations: number;
  events: number;
  review_required: number;
  reviewed: number;
}

export interface NodeInfo {
  node_id: string;
  node_type: string;
  camera_ids: string[];
}

export interface Mission {
  mission_id: string;
  name: string;
  scenario: string;
  region: string;
  node_id: string;
  mode: MissionMode;
  planned_start: string;
  planned_end: string;
  /** [min_lon, min_lat, max_lon, max_lat] */
  area_bbox: [number, number, number, number];
  data_origin: DataOrigin;
  schema_version: string;
}

/** GET /missions/{id} */
export interface MissionDetail extends Mission {
  node: NodeInfo;
  counts: MissionCounts;
}

export interface TrackPoint {
  track_point_id: string;
  mission_id: string;
  node_id: string;
  captured_at: string;
  lat: number;
  lon: number;
  h_acc_m: number;
  speed_mps: number;
  heading_deg: number;
  source: TrackSource;
  quality_flag: TrackQuality;
  data_origin: DataOrigin;
}

export interface Evidence {
  frame_uri: string | null;
  thumb_uri: string | null;
  crop_uri: string | null;
  provenance: Provenance;
}

export interface Observation {
  observation_id: string;
  source_sensor: "camera_surface" | "camera_underwater";
  paired_observation_id: string | null;
  evidence: Evidence;
  quality_score: number;
  quality_flags?: string[];
}

export interface ModelOutput {
  model_output_id: string;
  class: string;
  confidence: number;
  bbox: [number, number, number, number] | null;
  model_id: string;
  model_version: string;
  inference_origin: Provenance;
}

export interface EventContext {
  dataset_id: string;
  provider: string;
  variable: string;
  value: number;
  unit: string;
  observed_at: string;
  station_name: string;
  distance_km: number;
  time_offset_min: number;
  relation: ContextRelation;
  provenance: Provenance;
}

export interface Review {
  status: ReviewStatus;
  current_label: string | null;
  last_action: ReviewAction | null;
  by: string | null;
  /** Real wall-clock time when the reviewer clicked. */
  at: string | null;
  /** Replay mission time at that moment (null if unknown). */
  mission_time?: string | null;
  note?: string | null;
}

export interface DeviceSnapshot {
  battery_pct: number;
  connectivity: Connectivity;
  storage_pct: number;
}

export interface Event {
  event_id: string;
  mission_id: string;
  node_id: string;
  event_type: string;
  perspective: Perspective;
  captured_at: string;
  position: Position;
  observation: Observation;
  model_output: ModelOutput;
  context: EventContext[];
  attention: Attention;
  attention_reasons: string[];
  review: Review;
  data_origin: DataOrigin;
  device: DeviceSnapshot;
}

export interface EventSummary {
  event_id: string;
  mission_id: string;
  event_type: string;
  perspective: Perspective;
  captured_at: string;
  position: Position;
  confidence: number;
  quality_score: number;
  attention: Attention;
  review: Review;
  data_origin: DataOrigin;
}

export interface ReviewRequest {
  action: ReviewAction;
  new_label?: string | undefined;
  note?: string | undefined;
  reviewer: string;
  request_id: string;
}

export interface ContextDataset {
  dataset_id: string;
  provider: string;
  variable: string;
  unit: string;
  station_name: string;
  lat: number;
  lon: number;
  provenance: Provenance;
  label: string;
}

export interface ContextRecord {
  dataset_id: string;
  variable: string;
  value: number;
  unit: string;
  observed_at: string;
  station_name: string;
  provenance: Provenance;
}

export interface MissionContext {
  datasets: ContextDataset[];
  records: ContextRecord[];
}

export interface NodeStatus {
  battery_pct: number;
  connectivity: Connectivity;
  gnss_status: GnssStatus;
  surface_camera: CameraStatus;
  underwater_camera: CameraStatus;
  storage_pct: number;
}

/** POST /events/{id}/review */
export interface ReviewResponse {
  review: Review;
  event: Event;
}

export interface ReplayStatus {
  state: ReplayState;
  mission_time: string;
  speed: number;
  started_at: string | null;
}

export interface ReplayCommand {
  action: "start" | "pause" | "resume" | "seek" | "speed";
  to?: string | undefined;
  speed?: number | undefined;
}

export interface ReportSummary {
  mission_id: string;
  name: string;
  period_start: string;
  period_end: string;
  until: string;
  observations: number;
  events: number;
  review_required: number;
  reviewed: number;
  path_length_km: number;
  data_origin: DataOrigin;
  model_versions: string[];
  datasets: { dataset_id: string; provider: string; provenance: Provenance }[];
  generated_at: string;
}

export interface ExportResult {
  file_uri: string;
}

/* ---------- Danube level forecast (/danube/..., organiser data 2021) ---------- */

export type DanubeAlertType = "low_water" | "high_water" | "rapid_rise" | "rapid_fall";
export type DanubeAction = "survey_shallows" | "survey_behind_crest" | "routine";

export interface DanubeStation {
  station_id: string;
  name: string;
  name_bg: string;
  country: string;
  river: string;
  river_km: number | null;
  lat: number | null;
  lon: number | null;
  coords_approx: boolean;
  source: string;
}

export interface DanubeThresholds {
  low_cm: number | null;
  high_cm: number | null;
  basis: string;
}

interface DanubeHeader {
  provenance: Provenance;
  source: string;
  data_from: string;
  data_to: string;
}

export interface DanubeProfilePoint {
  station_id: string;
  name: string;
  country: string;
  river_km: number;
  level_cm: number;
  change_24h_cm: number | null;
  anomaly_cm: number;
  water_temp_c?: number | null;
  lat?: number | null;
  lon?: number | null;
}

export interface DanubeProfile extends DanubeHeader {
  river: string;
  date: string;
  points: DanubeProfilePoint[];
}

export interface DanubeSeries extends DanubeHeader {
  station: DanubeStation;
  thresholds: DanubeThresholds;
  series: { date: string; level_cm: number | null; water_temp_c: number | null }[];
}

export interface DanubeForecastPoint {
  date: string;
  horizon_days: number;
  level_cm: number;
  band_low_cm: number | null;
  band_high_cm: number | null;
  observed_cm: number | null;
}

export interface DanubeAlert {
  type: DanubeAlertType;
  date: string;
  eta_days: number;
  level_cm: number;
  message: string;
}

export interface DanubeForecast extends DanubeHeader {
  station: DanubeStation;
  as_of: string;
  observed_level_cm: number;
  thresholds: DanubeThresholds;
  forecast: DanubeForecastPoint[];
  alerts: DanubeAlert[];
  drivers: { station_id: string; name: string; river_km: number; contribution_cm: number }[];
  model: {
    method: string;
    predictors: string[];
    training_rows: number;
    training_from: string | null;
    training_to: string | null;
    band: string;
  };
  recommendation: { action: DanubeAction; by: string | null; text: string };
  mission_id?: string;
}

export interface DanubeBacktest extends DanubeHeader {
  station: DanubeStation;
  method: string;
  thresholds: DanubeThresholds;
  skill: {
    horizon_days: number;
    n: number;
    mae_model_cm: number | null;
    mae_persistence_cm: number | null;
    improvement_pct: number | null;
  }[];
  threshold_crossings: { type: "low_water" | "high_water"; observed_on: string; level_cm: number; warned_days_ahead: number | null }[];
}
