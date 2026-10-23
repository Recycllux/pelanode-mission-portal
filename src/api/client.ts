import type {
  DanubeBacktest,
  DanubeForecast,
  DanubePointContext,
  DanubeProfile,
  DanubeSeries,
  Event,
  EventSummary,
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
  TrackPoint,
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
