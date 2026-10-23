import { createFileRoute, Link } from "@tanstack/react-router";
import { BatteryMedium, Camera, Compass, Gauge, HardDrive, MapPin, Satellite, Timer, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import type { CameraStatus } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/pn/AppShell";
import { SourceChip } from "@/components/pn/chips";
import { useMission, useMissionTime, useNodeStatus, useTrack } from "@/hooks/use-mission";
import { cn } from "@/lib/utils";
import { fmtCoord, fmtDateUtc, fmtUtc, humanize } from "@/lib/pn-format";

export const Route = createFileRoute("/nodes")({
  head: () => ({
    meta: [
      { title: "Nodes — PelaNode Intelligence Portal" },
      { name: "description", content: "Fleet overview of PelaNode devices and their health." },
      { property: "og:title", content: "Nodes — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Fleet overview of PelaNode devices and their health." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NodesPage,
});

const CAMERA_STYLE: Record<CameraStatus, string> = {
  ok: "border-teal/30 bg-teal-soft text-teal",
  degraded: "border-attention/40 bg-attention-soft text-attention-foreground",
  unavailable: "border-review/30 bg-review-soft text-review",
};

function Tile({ icon, k, v, children, source }: { icon: ReactNode; k: string; v: ReactNode; children?: ReactNode; source?: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span className="flex-1">{k}</span>
        {source}
      </div>
      <div className="mt-1 text-2xl font-bold tabular">{v}</div>
      {children}
    </div>
  );
}

function NodesPage() {
  const { data: mission } = useMission();
  const { data: status } = useNodeStatus();
  const { data: track = [] } = useTrack();
  const until = useMissionTime();
  const head = track.at(-1);
  const node = mission?.node;
  const cameras: { id: string | undefined; label: string; status: CameraStatus | undefined }[] = [
    { id: node?.camera_ids[0], label: "Surface camera", status: status?.surface_camera },
    { id: node?.camera_ids[1], label: "Underwater camera", status: status?.underwater_camera },
  ];

  return (
    <AppShell screen="Nodes">
      <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold">Nodes</h1>
            <p className="mt-1 text-sm text-muted-foreground">PelaNode devices and their health at mission time {fmtUtc(until)}. One node is deployed in this demo.</p>
          </div>
          <span className="ml-auto text-sm text-muted-foreground">1 node · {status?.connectivity === "online" ? "1 online" : "0 online"}</span>
        </div>

        <section className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Satellite className="h-5 w-5 text-teal" aria-hidden />
                <span className="text-xl font-bold">{node?.node_id ?? "…"}</span>
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold capitalize", status?.connectivity === "online" ? "border-teal/30 bg-teal-soft text-teal" : "border-review/30 bg-review-soft text-review")}>
                  {status?.connectivity ?? "…"}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {humanize(node?.node_type)} · on mission <span className="font-medium text-foreground">{mission ? `${mission.mission_id} · ${mission.name}` : "…"}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                <span className="capitalize">{mission?.mode ?? "—"}</span> · {mission?.region ?? "—"} · planned {mission ? `${fmtDateUtc(mission.planned_start)} to ${fmtUtc(mission.planned_end, false)}` : "—"}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <SourceChip source="simulated" label="Simulated device" />
              <Button asChild size="sm" variant="outline">
                <Link to="/">Show on map</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={<BatteryMedium className="h-4 w-4" />} k="Battery" v={status ? `${status.battery_pct}%` : "—"} source={<SourceChip source="simulated" />}>
              <Progress value={status?.battery_pct ?? 0} className="mt-2" aria-label="Battery" />
            </Tile>
            <Tile icon={<HardDrive className="h-4 w-4" />} k="Storage used" v={status ? `${status.storage_pct}%` : "—"} source={<SourceChip source="simulated" />}>
              <Progress value={status?.storage_pct ?? 0} className="mt-2" aria-label="Storage used" />
            </Tile>
            <Tile icon={<Wifi className="h-4 w-4" />} k="Connectivity" v={<span className="capitalize">{status?.connectivity ?? "—"}</span>} source={<SourceChip source="simulated" />} />
            <Tile icon={<Gauge className="h-4 w-4" />} k="GNSS" v={status ? humanize(status.gnss_status) : "—"} source={<SourceChip source="replayed" />}>
              <div className="mt-1 text-xs text-muted-foreground tabular">{head ? `± ${head.h_acc_m.toFixed(1)} m horizontal` : "No fix yet"}</div>
            </Tile>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cameras</h2>
              <ul className="space-y-2">
                {cameras.map((c) => (
                  <li key={c.label} className="flex items-center gap-3">
                    <Camera className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1 text-sm">
                      <span className="font-medium">{c.label}</span> <span className="text-muted-foreground tabular">{c.id ?? "—"}</span>
                    </span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", c.status ? CAMERA_STYLE[c.status] : "text-muted-foreground")}>{c.status ? humanize(c.status) : "…"}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Last position</h2>
                <SourceChip source={head?.data_origin ?? "replayed"} />
              </div>
              {head ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden /> Position</dt>
                  <dd className="tabular">{fmtCoord(head.lat, head.lon)}</dd>
                  <dt className="flex items-center gap-2 text-muted-foreground"><Timer className="h-4 w-4" aria-hidden /> Fix time</dt>
                  <dd className="tabular">{fmtUtc(head.captured_at)}</dd>
                  <dt className="flex items-center gap-2 text-muted-foreground"><Compass className="h-4 w-4" aria-hidden /> Heading · speed</dt>
                  <dd className="tabular">{Math.round(head.heading_deg)}° · {head.speed_mps.toFixed(2)} m/s</dd>
                  <dt className="flex items-center gap-2 text-muted-foreground"><Gauge className="h-4 w-4" aria-hidden /> Track points</dt>
                  <dd className="tabular">{track.length} · quality {humanize(head.quality_flag)}</dd>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No position yet. Start the replay from the Mission Map.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
