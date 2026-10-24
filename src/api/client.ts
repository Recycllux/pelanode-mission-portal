import type {
  DanubeAnomalies,
  DanubeBacktest,
  DanubeForecast,
  DanubeLags,
  DanubePointContext,
  DanubeProfile,
  DanubeSeries,
  DanubeStations,
  Event,
  EventSummary,
  IskarSeries,
  ExportFormat,
  ExportResult,
  MissionDetail,
  MissionContext,
  NodeStatus,
  ReplayCommand,
  ReplayStatus,
  ReportSummary,
  ReviewRequest,
  ReviewResponse,
  ScenarioDatasets,
  TrackPoint,
  TributaryInputEvent,
} from "./types";

export interface PelaApi {
  readonly kind: "http" | "mock";
  getMission(id: string): Promise<MissionDetail>;
  getTrack(id: string, until: string): Promise<TrackPoint[]>;
  listEvents(missionId: string, until: string): Promise<EventSummary[]>;
  getEvent(id: string): Promise<Event>;
  reviewEvent(id: string, body: ReviewRequest): Promise<ReviewResponse>;
  getContext(id: string): Promise<MissionContext>;
  getNodeStatus(nodeId: string, missionId: string): Promise<NodeStatus>;
  getReplay(id: string): Promise<ReplayStatus>;
  controlReplay(id: string, cmd: ReplayCommand): Promise<ReplayStatus>;
  getReport(id: string): Promise<ReportSummary>;
  exportReport(id: string, format: ExportFormat): Promise<ExportResult>;
  resetDemo(missionId: string): Promise<void>;
  /** Danube level forecast for the station nearest the mission, as of a 2021 date (organiser data). */
  getDanubeForecast(missionId: string, asOf: string): Promise<DanubeForecast>;
  getDanubeProfile(date: string): Promise<DanubeProfile>;
  getDanubeSeries(stationId: string): Promise<DanubeSeries>;
  getDanubeBacktest(stationId: string): Promise<DanubeBacktest>;
  /** Real data at a position: nearest Danube gauge on asOf (2021) and the climate grid cell (2024, same calendar month). */
  getDanubePoint(lat: number, lon: number, asOf: string): Promise<DanubePointContext>;
  getDanubeStations(): Promise<DanubeStations>;
  /** Lagged propagation edges: adjacent gauges of both lower-Danube chains, or every downstream gauge from `source`. */
  getDanubeLags(source?: string): Promise<DanubeLags>;
  /** Candidate water-temperature anomalies (Bulgarian gauges, two-sided reference, threshold 4). */
  getDanubeAnomalies(): Promise<DanubeAnomalies>;
  /** Compatibility state per dataset on the common 2025 scenario timeline. */
  getScenarioDatasets(): Promise<ScenarioDatasets>;
  getIskarSeries(): Promise<IskarSeries>;
  /** Scenario-aligned Iskar input event with the confluence handoff (computed, not stored). */
  createIskarEvent(stationId: string, scenarioDate: string): Promise<TributaryInputEvent>;
  /** Resolve a /media/... URI to a loadable URL, or null when no real frame exists. */
  mediaUrl(uri: string | null): string | null;
  /** Resolve an export file_uri to an openable URL. */
  fileUrl(uri: string): string;
}

export const PN_KEY_STORAGE = "pn_key";

export function getPnKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PN_KEY_STORAGE) ?? "";
}
