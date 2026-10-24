import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ContextDataset, ContextRecord } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "@/components/pn/AppShell";
import { SourceChip } from "@/components/pn/chips";
import { CompatibilityPanel } from "@/components/pn/CompatibilityPanel";
import { ContextChart } from "@/components/pn/ContextChart";
import { DANUBE_REPLAY_DATE, useDanubeGauges, useDanubePoint, useEvents, useMission, useMissionContext, useMissionTime, useTrack } from "@/hooks/use-mission";
import { fmtDateUtc, fmtNum, fmtUtc, humanize } from "@/lib/pn-format";

export const Route = createFileRoute("/context")({
  head: () => ({
    meta: [
      { title: "Datasets — PelaNode Intelligence Portal" },
      { name: "description", content: "Every dataset shown alongside mission HACK-001: simulated discharge and water level, real Danube gauges and the climate grid, with source and period." },
      { property: "og:title", content: "Datasets — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Browse the datasets associated with missions — discharge, water level, Danube gauges and climate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DatasetsPage,
});

const fmtValue = (v: number, unit: string) => `${fmtNum(v, unit === "m" ? 2 : 0)} ${unit}`;
const signed = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${fmtNum(n, 0)}`);

function DatasetsPage() {
  const { data: ctx } = useMissionContext();
  const { data: mission } = useMission();
  const { data: events = [] } = useEvents();
  const { data: track = [] } = useTrack();
  const until = useMissionTime();
  const gauges = useDanubeGauges();
  const start = track[0];
  const point = useDanubePoint(start?.lat, start?.lon);

  const visible = useMemo(() => {
    const u = until ? Date.parse(until) : Infinity;
    return (ctx?.records ?? []).filter((r) => Date.parse(r.observed_at) <= u);
  }, [ctx, until]);

  return (
    <AppShell screen="Datasets">
      <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <div>
          <h1 className="text-2xl font-bold">Datasets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything the portal shows next to PelaNode observations, with its source. Context values are associated with events by time and distance only; they do not explain them.
          </p>
        </div>

        <CompatibilityPanel />

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide">Mission context · {mission?.mission_id ?? "…"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(ctx?.datasets ?? []).map((d) => (
              <DatasetCard key={d.dataset_id} d={d} all={ctx?.records ?? []} visible={visible} />
            ))}
          </div>
          <ContextChart context={ctx} events={events} until={until} missionStart={mission?.planned_start} missionEnd={mission?.planned_end} />
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide">Records up to {fmtUtc(until, false)}</h3>
              <span className="text-xs text-muted-foreground tabular">{visible.length} of {ctx?.records.length ?? 0} records</span>
            </div>
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records at this mission time.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Observed</TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Variable</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...visible].reverse().map((r) => (
                    <TableRow key={`${r.dataset_id}-${r.observed_at}`}>
                      <TableCell className="tabular">{fmtDateUtc(r.observed_at)}</TableCell>
                      <TableCell className="tabular">{r.dataset_id}</TableCell>
                      <TableCell>{humanize(r.variable)}</TableCell>
                      <TableCell>{r.station_name}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{fmtValue(r.value, r.unit)}</TableCell>
                      <TableCell><SourceChip source={r.provenance} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide">Danube gauges · {DANUBE_REPLAY_DATE}</h2>
            <SourceChip source="organiser" label="Real 2021" />
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link to="/danube">Open Danube Forecast</Link>
            </Button>
          </div>
          <div className="rounded-lg border bg-card p-4">
            {gauges.isError ? (
              <p className="text-sm text-muted-foreground">Gauge data unavailable: {(gauges.error as Error).message}</p>
            ) : !gauges.data ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  {gauges.data.source}. The 2026 mission is replayed against {DANUBE_REPLAY_DATE}. Station positions are approximate.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gauge</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">River km</TableHead>
                      <TableHead className="text-right">Level</TableHead>
                      <TableHead className="text-right">24 h change</TableHead>
                      <TableHead className="text-right">vs usual</TableHead>
                      <TableHead className="text-right">Water temp.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gauges.data.points.map((p) => (
                      <TableRow key={p.station_id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.country}</TableCell>
                        <TableCell className="text-right tabular">{fmtNum(p.river_km, 0)}</TableCell>
                        <TableCell className="text-right font-semibold tabular">{fmtNum(p.level_cm, 0)} cm</TableCell>
                        <TableCell className="text-right tabular">{signed(p.change_24h_cm)} cm</TableCell>
                        <TableCell className={`text-right font-semibold tabular ${p.anomaly_cm < 0 ? "text-attention" : "text-teal"}`}>{signed(p.anomaly_cm)} cm</TableCell>
                        <TableCell className="text-right tabular">{p.water_temp_c == null ? "—" : `${fmtNum(p.water_temp_c, 1)} °C`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide">Climate grid at the mission start</h2>
            <SourceChip source="organiser" label="Real 2024" />
          </div>
          {!point.data ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{point.isError ? `Climate data unavailable: ${(point.error as Error).message}` : "Loading…"}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {point.data.climate.map((c) => (
                <div key={c.variable} className="rounded-lg border bg-card p-4">
                  <div className="font-semibold">{c.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.source}</div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Unit</dt>
                    <dd className="tabular">{c.unit}</dd>
                    <dt className="text-muted-foreground">Grid cell</dt>
                    <dd className="tabular">{c.cell_lat.toFixed(2)}°N, {c.cell_lon.toFixed(2)}°E · {c.cell_distance_km.toFixed(1)} km away</dd>
                    <dt className="text-muted-foreground">Months in record</dt>
                    <dd className="tabular">{c.series.length}</dd>
                  </dl>
                </div>
              ))}
              <p className="text-xs text-muted-foreground md:col-span-2">{point.data.note}</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function DatasetCard({ d, all, visible }: { d: ContextDataset; all: ContextRecord[]; visible: ContextRecord[] }) {
  const own = all.filter((r) => r.dataset_id === d.dataset_id);
  const latest = visible.filter((r) => r.dataset_id === d.dataset_id).at(-1);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{humanize(d.variable)}</div>
          <div className="text-xs text-muted-foreground tabular">{d.dataset_id}</div>
        </div>
        <SourceChip source={d.provenance} label={d.label} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Provider</dt>
        <dd>{d.provider}</dd>
        <dt className="text-muted-foreground">Station</dt>
        <dd>{d.station_name} <span className="text-muted-foreground tabular">({d.lat.toFixed(3)}, {d.lon.toFixed(3)})</span></dd>
        <dt className="text-muted-foreground">Period</dt>
        <dd className="tabular">{own.length ? `${fmtUtc(own[0]!.observed_at, false)} to ${fmtUtc(own.at(-1)!.observed_at, false)}` : "—"}</dd>
        <dt className="text-muted-foreground">Records</dt>
        <dd className="tabular">{own.length}</dd>
        <dt className="text-muted-foreground">Latest so far</dt>
        <dd className="font-semibold tabular">{latest ? `${fmtValue(latest.value, latest.unit)} at ${fmtUtc(latest.observed_at, false)}` : "—"}</dd>
      </dl>
    </div>
  );
}
