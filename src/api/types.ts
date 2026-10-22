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
