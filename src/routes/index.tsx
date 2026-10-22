import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, BatteryMedium, Gauge, Navigation, Ruler, Satellite, Timer, Wifi } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { haversineKm } from "@/api/mock-data";
import type { ContextRecord } from "@/api/types";
import { AppShell } from "@/components/pn/AppShell";
import { ConfidenceText, EventGlyph, ReviewBadge, SourceChip } from "@/components/pn/chips";
import { EventDetailView } from "@/components/pn/EventDetailView";
import { LazyMap } from "@/components/pn/LazyMap";
import type { MapLayers } from "@/components/pn/MissionMap";
import { TimeBar } from "@/components/pn/TimeBar";
import { useEvents, useMission, useMissionContext, useMissionTime, useNodeStatus, useTrack } from "@/hooks/use-mission";
import { eventTitle, fmtDuration, fmtNum, fmtUtc, humanize, reviewTone, sortReviewQueue } from "@/lib/pn-format";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { event?: string } => (typeof s["event"] === "string" ? { event: s["event"] } : {}),
  head: () => ({
    meta: [
      { title: "Mission Map — PelaNode Intelligence Portal" },
      { name: "description", content: "Live replay of the PelaNode drift mission HACK-001: track, AI-generated events and simulated water context." },
      { property: "og:title", content: "Mission Map — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Replay where the PelaNode drifted, what it observed and which observations need review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionMapPage,
});

function Stat({ icon, k, v, source }: { icon: ReactNode; k: string; v: ReactNode; source?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="w-28 text-sm text-muted-foreground">{k}</span>
      <span className="flex-1 text-sm font-semibold tabular">{v}</span>
      {source}
    </div>
  );
}

function MissionMapPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { data: mission } = useMission();
  const { data: track = [] } = useTrack();
  const { data: events = [] } = useEvents();
  const { data: node } = useNodeStatus();
  const { data: ctx } = useMissionContext();
  const until = useMissionTime();
  const [layers, setLayers] = useState<MapLayers>({ track: true, events: true, discharge: false, level: false });
  const [focusKey, setFocusKey] = useState(0);

  const selectedId = search.event;
  const selected = events.find((e) => e.event_id === selectedId);
  const focus = selected ? { lat: selected.position.lat, lon: selected.position.lon, key: `${selected.event_id}-${focusKey}` } : null;

  const select = (id: string | undefined) => {
    setFocusKey((k) => k + 1);
    navigate({ search: id ? { event: id } : {}, replace: true });
  };

  const distanceKm = useMemo(() => {
    let d = 0;
    for (let i = 1; i < track.length; i++) d += haversineKm(track[i - 1]!.lat, track[i - 1]!.lon, track[i]!.lat, track[i]!.lon);
    return d;
  }, [track]);

  const latest = useMemo(() => {
    const out: Record<string, ContextRecord | undefined> = {};
    const u = until ? Date.parse(until) : Infinity;
    for (const r of ctx?.records ?? []) if (Date.parse(r.observed_at) <= u) out[r.dataset_id] = r;
    return out;
  }, [ctx, until]);

  const queue = sortReviewQueue(events);
  const elapsed = mission && until ? Date.parse(until) - Date.parse(mission.planned_start) : 0;
  const head = track.at(-1);

  const layerRows: { key: keyof MapLayers; label: string; source: ReactNode }[] = [
    { key: "track", label: "Track", source: <SourceChip source="replayed" /> },
    { key: "events", label: "Events", source: <SourceChip source="simulated" label="Sim AI" /> },
    { key: "discharge", label: "Discharge", source: <SourceChip source="simulated" /> },
    { key: "level", label: "Water level", source: <SourceChip source="simulated" /> },
  ];

  return (
    <AppShell screen="Mission Map" fill>
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1">
          <div className="relative isolate min-w-0 flex-1">
            <LazyMap track={track} events={events} datasets={ctx?.datasets} latest={latest} layers={layers} selectedId={selectedId} focus={focus} onSelectEvent={select} />

            <div className="absolute left-14 top-3 z-[500] w-64 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Layers</h2>
              {layerRows.map((l) => (
                <label key={l.key} className="flex min-h-10 cursor-pointer items-center gap-2">
                  <Switch checked={layers[l.key]} onCheckedChange={(v) => setLayers((s) => ({ ...s, [l.key]: v }))} aria-label={l.label} />
                  <span className="flex-1 text-sm font-medium">{l.label}</span>
                  {l.source}
                </label>
              ))}
              {(layers.discharge || layers.level) && (
                <div className="mt-2 space-y-1 border-t pt-2 text-xs">
                  {ctx?.datasets
                    .filter((d) => (d.variable === "discharge" ? layers.discharge : layers.level))
                    .map((d) => {
                      const r = latest[d.dataset_id];
                      return (
                        <div key={d.dataset_id} className="flex justify-between gap-2 tabular">
                          <span className="text-muted-foreground">{d.station_name}</span>
                          <span className="font-semibold">{r ? `${fmtNum(r.value, d.unit === "m" ? 2 : 0)} ${d.unit}` : "—"}</span>
                        </div>
                      );
                    })}
                  <p className="text-muted-foreground">Stations lie off-screen upstream/downstream; zoom out to see them.</p>
                </div>
              )}
            </div>

            <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-3 rounded-lg border bg-card/95 px-3 py-2 text-xs shadow">
              <span className="flex items-center gap-1"><EventGlyph perspective="above" tone="unreviewed" confidence={1} size={14} /> Above water</span>
              <span className="flex items-center gap-1"><EventGlyph perspective="below" tone="unreviewed" confidence={1} size={14} /> Below water</span>
              <span className="flex items-center gap-1"><EventGlyph perspective="above" tone="required" confidence={1} size={14} /> Review required</span>
              <span className="flex items-center gap-1"><EventGlyph perspective="above" tone="confirmed" confidence={1} size={14} /> Confirmed</span>
              <span className="flex items-center gap-1"><EventGlyph perspective="above" tone="unreviewed" confidence={0.3} size={14} /> Low confidence (hollow)</span>
            </div>
          </div>

          <aside className="flex w-[420px] shrink-0 flex-col overflow-y-auto border-l bg-card">
            <section className="border-b p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mission status</h2>
                <SourceChip source={mission?.data_origin ?? "simulated"} />
              </div>
              <div className="mt-2 text-lg font-bold">{mission?.name ?? "…"}</div>
              <div className="text-sm text-muted-foreground">{mission?.mission_id} · {mission?.region}</div>
              <div className="mt-3 divide-y">
                <Stat icon={<Satellite className="h-4 w-4" />} k="Node" v={mission?.node.node_id ?? "—"} />
                <Stat icon={<Navigation className="h-4 w-4" />} k="Mode" v={<span className="capitalize">{mission?.mode ?? "—"}{head ? ` · ${Math.round(head.heading_deg)}°` : ""}</span>} />
                <Stat icon={<Timer className="h-4 w-4" />} k="Elapsed" v={`${fmtDuration(elapsed)} (${fmtUtc(until)})`} />
                <Stat icon={<Ruler className="h-4 w-4" />} k="Distance" v={`${distanceKm.toFixed(2)} km`} source={<SourceChip source="replayed" />} />
                <Stat icon={<BatteryMedium className="h-4 w-4" />} k="Battery" v={node ? `${node.battery_pct}%` : "—"} source={<SourceChip source="simulated" />} />
                <Stat icon={<Wifi className="h-4 w-4" />} k="Connectivity" v={<span className="capitalize">{node?.connectivity ?? "—"}</span>} source={<SourceChip source="simulated" />} />
                <Stat icon={<Gauge className="h-4 w-4" />} k="GNSS" v={<span className="capitalize">{node ? humanize(node.gnss_status) : "—"}</span>} source={<SourceChip source="replayed" />} />
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2 border-b p-5">
              {[
                { k: "Events", v: mission?.counts.events ?? 0 },
                { k: "Review required", v: mission?.counts.review_required ?? 0, warn: true },
                { k: "Reviewed", v: mission?.counts.reviewed ?? 0 },
              ].map((c) => (
                <div key={c.k} className={`rounded-md border p-3 ${c.warn && c.v ? "border-review/40 bg-review-soft" : ""}`}>
                  <div className={`text-2xl font-bold tabular ${c.warn && c.v ? "text-review" : ""}`}>{c.v}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">{c.warn && <AlertTriangle className="h-3 w-3" aria-hidden />}{c.k}</div>
                </div>
              ))}
            </section>

            <section className="flex-1 p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Review queue</h2>
              {queue.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  {events.length === 0 ? "No events yet. Press Start to replay the mission." : "All visible events have been reviewed."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {queue.map((e) => (
                    <li key={e.event_id}>
                      <button
                        type="button"
                        onClick={() => select(e.event_id)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-teal hover:bg-teal-soft ${selectedId === e.event_id ? "border-teal bg-teal-soft" : ""}`}
                      >
                        <EventGlyph perspective={e.perspective} tone={reviewTone(e)} confidence={e.confidence} size={22} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{eventTitle(e)}</div>
                          <div className="text-xs text-muted-foreground tabular">{e.event_id} · {fmtUtc(e.captured_at, false)} · {e.perspective === "above" ? "above" : "below"}</div>
                          <div className="mt-1"><ReviewBadge tone={reviewTone(e)} /></div>
                        </div>
                        <ConfidenceText value={e.confidence} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
        <TimeBar onSelectEvent={select} />
      </div>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && select(undefined)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[820px]">
          <SheetTitle className="sr-only">Event detail</SheetTitle>
          <SheetDescription className="sr-only">Evidence, model output, review and associated context</SheetDescription>
          {selectedId && (
            <div className="pt-6">
              <EventDetailView eventId={selectedId} compact onNavigate={(id) => select(id)} onShowOnMap={() => setFocusKey((k) => k + 1)} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
