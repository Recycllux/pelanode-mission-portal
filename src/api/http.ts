import { getPnKey, type PelaApi } from "./client";
import type { ExportFormat, ReplayCommand, ReviewRequest } from "./types";

export class HttpApi implements PelaApi {
  readonly kind = "http" as const;
  constructor(private base: string) {
    this.base = base.replace(/\/$/, "");
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

  getMission = (id: string) => this.get<import("./types").Mission>(`/missions/${encodeURIComponent(id)}`);
  getTrack = (id: string, until: string) =>
    this.get<import("./types").TrackPoint[]>(`/missions/${encodeURIComponent(id)}/track?until=${encodeURIComponent(until)}`);
  listEvents = (missionId: string, until: string) =>
    this.get<import("./types").EventSummary[]>(
      `/events?mission_id=${encodeURIComponent(missionId)}&until=${encodeURIComponent(until)}`,
    );
  getEvent = (id: string) => this.get<import("./types").Event>(`/events/${encodeURIComponent(id)}`);
  reviewEvent = (id: string, body: ReviewRequest) =>
    this.post<import("./types").Event>(`/events/${encodeURIComponent(id)}/review`, body);
  getContext = (id: string) => this.get<import("./types").MissionContext>(`/missions/${encodeURIComponent(id)}/context`);
  getNodeStatus = (nodeId: string, missionId: string) =>
    this.get<import("./types").NodeStatus>(
      `/nodes/${encodeURIComponent(nodeId)}/status?mission_id=${encodeURIComponent(missionId)}`,
    );
  getReplay = (id: string) => this.get<import("./types").ReplayStatus>(`/missions/${encodeURIComponent(id)}/replay`);
  controlReplay = (id: string, cmd: ReplayCommand) =>
    this.post<import("./types").ReplayStatus>(`/missions/${encodeURIComponent(id)}/replay`, cmd);
  getReport = (id: string) => this.get<import("./types").ReportSummary>(`/missions/${encodeURIComponent(id)}/report`);
  exportReport = (id: string, format: ExportFormat) =>
    this.post<import("./types").ExportResult>(`/missions/${encodeURIComponent(id)}/export`, { format });
  resetDemo = async (missionId: string) => {
    await this.post<void>(`/demo/reset`, { mission_id: missionId });
  };
  mediaUrl = (uri: string | null) => (uri ? (/^https?:/.test(uri) ? uri : `${this.base}${uri}`) : null);
  fileUrl = (uri: string) => (/^(https?:|blob:)/.test(uri) ? uri : `${this.base}${uri}`);
}
