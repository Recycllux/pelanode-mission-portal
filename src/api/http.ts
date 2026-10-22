import { getPnKey, type PelaApi } from "./client";
import type {
  Event,
  EventSummary,
  ExportFormat,
  ExportResult,
  MissionContext,
  MissionDetail,
  NodeStatus,
  ReplayCommand,
  ReplayStatus,
  ReportSummary,
  ReviewRequest,
  ReviewResponse,
  TrackPoint,
} from "./types";

const enc = encodeURIComponent;

/**
 * Talks to the Spring Boot API. `base` may be empty: then all requests are
 * same-origin relative URLs (/api/v1/..., /media/...).
 */
export class HttpApi implements PelaApi {
  readonly kind = "http" as const;
  private base: string;
  constructor(base: string) {
    this.base = base.trim().replace(/\/$/, "");
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}/api/v1${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}/api/v1${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-PN-Key": getPnKey() },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  getMission = (id: string) => this.get<MissionDetail>(`/missions/${enc(id)}`);
  getTrack = (id: string, until: string) => this.get<TrackPoint[]>(`/missions/${enc(id)}/track?until=${enc(until)}`);
  listEvents = (missionId: string, until: string) =>
    this.get<EventSummary[]>(`/events?mission_id=${enc(missionId)}&until=${enc(until)}`);
  getEvent = (id: string) => this.get<Event>(`/events/${enc(id)}`);
  reviewEvent = (id: string, body: ReviewRequest) => this.post<ReviewResponse>(`/events/${enc(id)}/review`, body);
  getContext = (id: string) => this.get<MissionContext>(`/missions/${enc(id)}/context`);
  getNodeStatus = (nodeId: string, missionId: string) =>
    this.get<NodeStatus>(`/nodes/${enc(nodeId)}/status?mission_id=${enc(missionId)}`);
  getReplay = (id: string) => this.get<ReplayStatus>(`/missions/${enc(id)}/replay`);
  controlReplay = (id: string, cmd: ReplayCommand) => this.post<ReplayStatus>(`/missions/${enc(id)}/replay`, cmd);
  getReport = (id: string) => this.get<ReportSummary>(`/missions/${enc(id)}/report`);
  exportReport = (id: string, format: ExportFormat) => this.post<ExportResult>(`/missions/${enc(id)}/export`, { format });
  resetDemo = async (missionId: string) => {
    await this.post<void>(`/demo/reset`, { mission_id: missionId });
  };
  mediaUrl = (uri: string | null) => (uri ? (/^https?:/.test(uri) ? uri : `${this.base}${uri}`) : null);
  fileUrl = (uri: string) => (/^(https?:|blob:)/.test(uri) ? uri : `${this.base}${uri}`);
}
