// All API types. Field names mirror the Spring Boot API contract (snake_case).

export type DataOrigin = "live" | "recorded" | "replayed" | "simulated";
export type Provenance = "simulated" | "replayed" | "recorded" | "placeholder" | "organiser" | "measured" | "live" | "derived_from_organiser" | "supplied_dataset";
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

/** Common 2025 scenario timeline (P0-19 §4.7): records keep their source date and are shown on 2025-MM-DD. */
export interface ScenarioInfo {
  year: number;
  source_year: number;
  time_alignment_method: "native_2025" | "year_harmonised_to_2025";
  scenario_assumption: boolean;
  /** "SCENARIO 2025 / SOURCE HISTORICAL" for harmonised data, "SCENARIO 2025" for native 2025 data. */
  badge: string;
  note: string;
}

interface DanubeHeader {
  provenance: Provenance;
  source: string;
  data_from: string;
  data_to: string;
  scenario?: ScenarioInfo;
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
  scenario_date?: string | null;
  points: DanubeProfilePoint[];
}

export interface DanubePointClimate {
  variable: "precipitation" | "soil_moisture";
  name: string;
  unit: string;
  source: string;
  cell_lat: number;
  cell_lon: number;
  cell_distance_km: number;
  /** Climate grid month (2024), matched to the Danube date by calendar month. */
  month: string | null;
  value: number | null;
  /** Share of Bulgarian grid cells below this value in the same month, 0 to 100. */
  rank_pct: number | null;
  series: { month: string; value: number | null }[];
}

/** Real data for one position: nearest Danube gauge (2021) and the climate grid cell (2024). */
export interface DanubePointContext {
  lat: number;
  lon: number;
  as_of?: string;
  nearest_gauge?: {
    station: DanubeStation;
    distance_km: number;
    date: string;
    level_cm: number | null;
    change_24h_cm: number | null;
    water_temp_c: number | null;
    thresholds: DanubeThresholds;
    forecastable: boolean;
    downstream_windows?: DanubeDownstreamWindow[];
    downstream_windows_note?: string;
  } | null;
  climate: DanubePointClimate[];
  provenance: Provenance;
  note: string;
}

export interface DanubeSeries extends DanubeHeader {
  station: DanubeStation;
  thresholds: DanubeThresholds;
  series: { date: string; scenario_date?: string | null; level_cm: number | null; water_temp_c: number | null }[];
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

/* ---------- Connected river intelligence (P0-19 v1.3: /danube/lags, /danube/anomalies, /scenario/...) ---------- */

export type QualityClass = "A" | "B" | "C";
export type DanubeChain = "ro_bulletin" | "bg_automatic" | "upstream_of_iron_gates" | "tributary";

export interface DanubeStations extends DanubeHeader {
  stations: {
    station: DanubeStation;
    coverage: number;
    forecastable: boolean;
    thresholds: DanubeThresholds;
    temperature_coverage?: number;
    has_temperature?: boolean;
    chain?: DanubeChain;
    in_propagation_model?: boolean;
  }[];
  contextual_sources?: {
    station: IskarStation;
    variable: string;
    data_from: string;
    data_to: string;
    native_overlap_with_danube_days: number;
    compatibility_state: CompatibilityState;
    label: string;
  }[];
}

export interface DanubeWindowDays {
  min: number;
  max: number;
}

/** Lagged correlation between two gauges of one chain. The lag is a river-level signal, never a pollutant travel time. */
export interface DanubeEdge {
  from_station: string;
  to_station: string;
  chain: DanubeChain;
  distance_km: number;
  n_common_observations: number;
  n_common_delta_h: number;
  data_gap_rate: number;
  r_level_lag0: number | null;
  optimal_lag_days_level: number | null;
  r_level_optimal_lag: number | null;
  optimal_lag_days_delta_h: number | null;
  r_delta_h: number | null;
  r_delta_h_at_level_lag: number | null;
  /** null for class C (not operational). */
  monitoring_window_days: DanubeWindowDays | null;
  quality_class: QualityClass;
  operational: boolean;
  reason: string | null;
  reliability: number;
}

export interface DanubeDownstreamWindow {
  station_id: string;
  distance_km: number;
  window_days: DanubeWindowDays;
  r_delta_h: number | null;
  quality_class: QualityClass;
  label: string;
}

export interface DanubeLags extends DanubeHeader {
  period: { from: string; to: string };
  method: { id: string; max_lag_days: number; min_n: number; class_rules: string; reliability: string; status: string };
  /** Present without `source`: stations of each lower-Danube chain, upstream to downstream. */
  chains?: Record<"ro_bulletin" | "bg_automatic", string[]>;
  source_station?: DanubeStation;
  chain?: DanubeChain;
  max_distance_km?: number;
  edges: DanubeEdge[];
  downstream_windows?: DanubeDownstreamWindow[];
  label: string;
  note: string;
}

export type AnomalyRole = "primary" | "neighbour_influenced";

export interface TemperatureCandidateAnomaly {
  event_type: "temperature_candidate_anomaly";
  event_id: string;
  observation: { station_id: string; date: string; scenario_date: string | null; water_temp_c: number; provenance: Provenance };
  model_output: {
    method: string;
    neighbours: string[];
    expected_temp_c: number;
    residual_c: number;
    robust_z: number;
    threshold: number;
    threshold_status: string;
    reference_type: "two_sided" | "one_sided";
    role: AnomalyRole;
    influenced_by: string | null;
    influenced: string[];
  };
  data_quality: { station_coverage: number };
  attention: "review_required";
  label: string;
  review: { status: string };
  source_attribution: null;
}

export interface AnomalyStationStats {
  station_id: string;
  neighbours: string[];
  reference_type: "two_sided" | "one_sided";
  n: number;
  baseline_median_c: number;
  baseline_mad_c: number;
  candidates_primary: number;
  candidates_influenced: number;
}

export interface DanubeAnomalies extends DanubeHeader {
  period: { from: string; to: string };
  method: { id: string; threshold: number; threshold_status: string; sigma: string };
  stations: AnomalyStationStats[];
  candidates: TemperatureCandidateAnomaly[];
  label: string;
  note: string;
}

export type CompatibilityState = "DEMONSTRATED" | "SCENARIO-ALIGNED" | "CONTEXT ONLY" | "OPTIONAL CONTEXT" | "FUTURE";

export interface ScenarioWindow {
  from: string | null;
  to: string | null;
  days?: number;
  note?: string;
}

export interface ScenarioDataset {
  dataset_id: string;
  name: string;
  source_years: number[];
  scenario_window: { source_from: string; source_to: string; scenario_from: string; scenario_to: string } | null;
  compatibility_state: CompatibilityState;
  allowed_use: string;
  checks: Record<string, string>;
}

export interface ScenarioDatasets {
  scenario: ScenarioInfo;
  shared_window: ScenarioWindow;
  datasets: ScenarioDataset[];
  rule: string;
}

export interface IskarStation {
  station_id: string;
  name: string;
  name_bg: string;
  river: string;
  lat: number;
  lon: number;
  coords_approx: boolean;
}

export interface ConfluenceNode {
  river: string;
  river_km: number;
  scenario_node: string;
  lat: number;
  lon: number;
  coords_approx: boolean;
}

export interface IskarSeries {
  provenance: string;
  source: string;
  compatibility_state: CompatibilityState;
  scenario: ScenarioInfo;
  shared_window: ScenarioWindow;
  label: string;
  from: string;
  to: string;
  stations: {
    station: IskarStation;
    days_present: number;
    days_missing: number;
    series: { date: string; scenario_date: string | null; discharge_m3s: number }[];
  }[];
  confluence: ConfluenceNode;
  suggested_events: { station_id: string; scenario_date: string; discharge_m3s: number; change_24h_m3s: number }[];
}

export interface HandoffWindow {
  station_id: string;
  distance_km: number;
  quality_class: QualityClass;
  r_delta_h: number | null;
  n_common_observations: number;
  window_days?: DanubeWindowDays;
  reason?: string;
}

/** Scenario-aligned Iskar input handed off at the confluence; never a measured Iskar → Danube propagation. */
export interface TributaryInputEvent {
  event_type: "tributary_input_event";
  event_id: string;
  observation: {
    tributary: string;
    station_id: string;
    source_date: string;
    source_year: number;
    scenario_date: string | null;
    time_alignment_method: string;
    data_origin: string;
    scenario_assumption: boolean;
    claim_scope: string;
    discharge_m3s: number;
    change_24h_m3s: number | null;
    provenance: string;
  };
  confluence: ConfluenceNode;
  handoff: {
    chain: DanubeChain;
    gauge: string;
    gauge_name: string;
    km_below_confluence: number;
    downstream_windows: HandoffWindow[];
    excluded: HandoffWindow[];
  }[];
  windows_period: { source: string; scenario_assumption: boolean };
  claim_scope: "scenario_aligned";
  attention: "informational";
  label: string;
  suggested_action: string;
  note: string;
  caveat?: string;
}
