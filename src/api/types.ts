// All API types. Field names mirror the Spring Boot API contract (snake_case).

export type DataOrigin = "simulated" | "replayed" | "live";
export type Provenance = "simulated" | "replayed" | "placeholder" | "organiser" | "measured" | "live";
export type Perspective = "above" | "below";
export type ReviewStatus = "unreviewed" | "confirmed" | "rejected" | "relabelled";
export type ReviewAction = "confirm" | "reject" | "relabel";
export type Attention = "review_required" | "none";
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
  name: string;
  model: string;
}

export interface Mission {
  mission_id: string;
  name: string;
  mode: "drift" | "anchored" | "towed";
  start_time: string;
  end_time: string;
  data_origin: DataOrigin;
  river: string;
  node: NodeInfo;
  counts: MissionCounts;
}

export interface TrackPoint {
  mission_id: string;
  t: string;
  lat: number;
  lon: number;
  heading_deg: number;
  speed_mps: number;
  h_acc_m: number;
  source: Provenance;
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
  relation: "coincides_with" | "associated_with";
  provenance: Provenance;
}

export interface Review {
  status: ReviewStatus;
  current_label: string | null;
  last_action: ReviewAction | null;
  by: string | null;
  at: string | null;
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
  storage_pct: number;
  gnss_quality: string;
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
