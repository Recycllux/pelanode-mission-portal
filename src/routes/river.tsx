import { keepPreviousData, useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, GitMerge, Waves } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  api,
  type AnomalyStationStats,
  type DanubeDownstreamWindow,
  type DanubeEdge,
  type DanubeLags,
  type TemperatureCandidateAnomaly,
  type TributaryInputEvent,
} from "@/api";
import { AppShell } from "@/components/pn/AppShell";
import { CompatibilityChip, QualityChip, ScenarioBadge, SourceChip } from "@/components/pn/chips";
import { CompatibilityPanel } from "@/components/pn/CompatibilityPanel";
import { LazyRiverMap } from "@/components/pn/LazyMap";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtNum, stationName, windowText } from "@/lib/pn-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/river")({
  head: () => ({
    meta: [
      { title: "River Intelligence — PelaNode Intelligence Portal" },
      { name: "description", content: "Connected downstream intelligence on real Danube monitoring data: learned propagation between stations, downstream monitoring windows and candidate temperature anomalies." },
      { property: "og:title", content: "River Intelligence — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Hydrological propagation, downstream monitoring windows and candidate anomalies on the lower Danube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RiverPage,
});

/** Frozen positioning (P0-19 v1.3). */
const POSITIONING =
  "PelaNode turns fragmented river-monitoring data into connected downstream intelligence: it learns hydrological propagation between stations, estimates where and when authorities should monitor downstream, and flags candidate environmental anomalies for investigation.";
const NOT_ETA = "Estimated from historical hydrological signal propagation (organiser data, Jun–Nov 2021). Not a pollutant travel time.";

const DAY = 86_400_000;
const FIRST = "2025-06-06";
const LAST = "2025-11-09";
const PRESETS = [
  { date: "2025-07-20", label: "Propagation", kind: "propagation" as const },
  { date: "2025-10-30", label: "Temperature candidate", kind: "anomaly" as const },
  { date: "2025-11-06", label: "Iskar input", kind: "iskar" as const },
];

const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Danube records are 2021; the page runs on the 2025 scenario timeline (month and day kept). */
const toSource = (scenario: string) => `2021${scenario.slice(4)}`;
const fmtDay = (d: string) => new Date(toMs(d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const signed = (n: number | null | undefined, digits = 0) => (n == null ? "—" : `${n > 0 ? "+" : ""}${fmtNum(n, digits)}`);

function RiverPage() {
  const [date, setDate] = useState("2025-07-20");
  const [slider, setSlider] = useState(toMs(date));
  const [source, setSource] = useState("CALAFAT");
  const [station, setStation] = useState<string | null>(null);
  const [edge, setEdge] = useState<DanubeEdge | null>(null);
  const [tributary, setTributary] = useState<TributaryInputEvent | null>(null);
  const sourceDate = toSource(date);

  const stations = useQuery({ queryKey: ["danube-stations"], queryFn: () => api().getDanubeStations(), staleTime: Infinity });
  const graph = useQuery({ queryKey: ["danube-lags"], queryFn: () => api().getDanubeLags(), staleTime: Infinity });
  const fromSource = useQuery({ queryKey: ["danube-lags", source], queryFn: () => api().getDanubeLags(source), staleTime: Infinity, placeholderData: keepPreviousData });
  const anomalies = useQuery({ queryKey: ["danube-anomalies"], queryFn: () => api().getDanubeAnomalies(), staleTime: Infinity });
  const profile = useQuery({ queryKey: ["danube-profile", sourceDate], queryFn: () => api().getDanubeProfile(sourceDate), placeholderData: keepPreviousData });
  const iskar = useQuery({ queryKey: ["iskar"], queryFn: () => api().getIskarSeries(), staleTime: Infinity });
  const createEvent = useMutation({
    mutationFn: (d: string) => api().createIskarEvent("OREHOVITSA", d),
    onSuccess: (ev) => setTributary(ev),
    onError: () => setTributary(null),
  });

  const levels = useMemo(() => Object.fromEntries((profile.data?.points ?? []).map((p) => [p.station_id, p])), [profile.data]);
  const onDay = useMemo(
    () => Object.fromEntries((anomalies.data?.candidates ?? []).filter((c) => c.observation.date === sourceDate).map((c) => [c.observation.station_id, c])),
    [anomalies.data, sourceDate],
  );
  const primaryDays = useMemo(
    () => [...new Set((anomalies.data?.candidates ?? []).filter((c) => c.model_output.role === "primary").map((c) => c.observation.date))].sort(),
    [anomalies.data],
  );
  const handoffWindows = useMemo(() => {
    const out: Record<string, DanubeDownstreamWindow> = {};
    for (const h of tributary?.handoff ?? []) {
      for (const w of h.downstream_windows) {
        if (w.window_days) out[w.station_id] = { station_id: w.station_id, distance_km: w.distance_km, window_days: w.window_days, r_delta_h: w.r_delta_h, quality_class: w.quality_class, label: "" };
      }
    }
    return out;
  }, [tributary]);
  const sourceWindows = useMemo(() => Object.fromEntries((fromSource.data?.downstream_windows ?? []).map((w) => [w.station_id, w])), [fromSource.data]);
  const inModel = useMemo(() => (stations.data?.stations ?? []).filter((s) => s.in_propagation_model), [stations.data]);

  const pick = (d: string) => {
    setDate(d);
    setSlider(toMs(d));
    setTributary(null);
    createEvent.reset();
  };
  const preset = (p: (typeof PRESETS)[number]) => {
    pick(p.date);
    setEdge(null);
    if (p.kind === "propagation") {
      setSource("CALAFAT");
      setStation(null);
    } else if (p.kind === "anomaly") {
      setStation("GORNI_VADIN");
    } else {
      setStation(null);
      createEvent.mutate(p.date);
    }
  };

  return (
    <AppShell screen="River Intelligence">
      <div className="mx-auto max-w-[1600px] space-y-5 px-6 py-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold">Connected river intelligence · lower Danube</h1>
            <p className="mt-1 text-sm">{POSITIONING}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <SourceChip source="organiser" label="Organiser data" />
              <ScenarioBadge />
              Track 2 — Build the Next Generation of Water-Smart Digital Solutions · software intelligence layer on real river-monitoring data
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.kind} variant={date === p.date ? "default" : "outline"} onClick={() => preset(p)}>
                {p.label} · {fmtDay(p.date).replace(" 2025", "")}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              Scenario date {fmtDay(toDate(slider))} <span className="font-normal text-muted-foreground">· Danube source date {fmtDay(toSource(toDate(slider)))}</span>
            </span>
            <span className="text-muted-foreground">Drag to replay any day from {fmtDay(FIRST)} to {fmtDay(LAST)}</span>
          </div>
          <Slider min={toMs(FIRST)} max={toMs(LAST)} step={DAY} value={[slider]} onValueChange={(v) => setSlider(v[0]!)} onValueCommit={(v) => pick(toDate(v[0]!))} aria-label="Scenario date" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
          <div className="space-y-3">
            <div className="h-[640px] overflow-hidden rounded-lg border">
              <LazyRiverMap
                stations={stations.data?.stations ?? []}
                edges={graph.data?.edges ?? []}
                levels={levels}
                source={tributary ? null : source}
                downstream={tributary ? handoffWindows : sourceWindows}
                anomalies={onDay}
                iskar={iskar.data ? { stations: iskar.data.stations.map((s) => s.station), confluence: iskar.data.confluence } : null}
                handoffGauges={tributary?.handoff.map((h) => h.gauge)}
                selectedStation={station}
                onSelectStation={(id) => {
                  setStation(id);
                  setEdge(null);
                  if (!onDay[id]) {
                    setSource(id);
                    setTributary(null);
                  }
                }}
                onSelectEdge={setEdge}
                onSelectIskar={() => createEvent.mutate(date)}
              />
            </div>
            <MapLegend />
          </div>
          <div className="space-y-5">
            <PropagationCard
              lags={fromSource.data}
              source={source}
              onSource={(s) => {
                setSource(s);
                setTributary(null);
              }}
              options={inModel.map((s) => ({ id: s.station.station_id, label: `${s.station.name} · km ${fmtNum(s.station.river_km ?? 0, 0)} · ${s.chain === "bg_automatic" ? "BG automatic" : "bulletin"}` }))}
              change={levels[source]?.change_24h_cm ?? null}
              edge={edge}
              date={date}
              hidden={!!tributary}
            />
            <AnomalyCard candidates={Object.values(onDay)} selected={station} onSelect={setStation} stats={anomalies.data?.stations ?? []} date={date} threshold={anomalies.data?.method.threshold ?? 4} days={primaryDays} />
            <TributaryCard event={tributary} error={createEvent.error as Error | null} pending={createEvent.isPending} date={date} window={iskar.data?.shared_window} suggested={iskar.data?.suggested_events ?? []} onCreate={(d) => (d === date ? createEvent.mutate(d) : preset({ date: d, label: "", kind: "iskar" }))} />
          </div>
        </div>

        <CompatibilityPanel />

        <p className="text-xs text-muted-foreground">
          Windows: {NOT_ETA} Thresholds and quality classes are proposed demo tuning; no ground truth exists for the temperature candidates. Danube data (2021) and Iskar data (2025) are shown on one 2025 scenario timeline; a harmonised record is a historical observation, not a 2025 measurement. Station positions are approximate. Chemistry is not shown on the map because it has no station identity.
        </p>
      </div>
    </AppShell>
  );
}

function MapLegend() {
  const line = (color: string, dashed = false) => <span className="inline-block h-0 w-6 border-t-[3px] align-middle" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />;
  const dot = (fill: string, ring = "var(--navy)") => <span className="inline-block h-3 w-3 rounded-full border-2 align-middle" style={{ background: fill, borderColor: ring }} />;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span>{line("var(--teal)")} Class A operational</span>
      <span>{line("var(--attention)")} Class B caution</span>
      <span>{line("var(--review)", true)} Class C not operational</span>
      <span>{dot("var(--navy)")} Source / Iskar handoff gauge</span>
      <span>{dot("var(--teal)")} Downstream window</span>
      <span>{dot("var(--attention)", "var(--review)")} Candidate anomaly</span>
      <span>{dot("var(--lowconf)")} Neighbour-influenced</span>
      <span>{line("var(--attention)", true)} Iskar (scenario-aligned)</span>
    </div>
  );
}

function CardTitle({ icon: Icon, children }: { icon: typeof Waves; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
      <Icon className="h-4 w-4 text-teal" aria-hidden /> {children}
    </h2>
  );
}

function PropagationCard({ lags, source, onSource, options, change, edge, date, hidden }: { lags: DanubeLags | undefined; source: string; onSource: (s: string) => void; options: { id: string; label: string }[]; change: number | null; edge: DanubeEdge | null; date: string; hidden: boolean }) {
  const windows = lags?.downstream_windows ?? [];
  const classes = (lags?.edges ?? []).filter((e) => e.operational).map((e) => e.quality_class);
  return (
    <div className={cn("rounded-lg border bg-card p-4", hidden && "opacity-60")}>
      <CardTitle icon={Waves}>Hydrological propagation</CardTitle>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Source</span>
        <Select value={source} onValueChange={onSource}>
          <SelectTrigger className="h-8 w-[300px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="mb-2 text-sm">
        <strong>{stationName(source)}</strong> · {fmtDay(date)}
        {change != null && <> · level change {signed(change)} cm / 24 h</>}
      </p>
      {windows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No operational downstream relationship from this station (data too gappy, or end of chain).</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Downstream station</TableHead>
              <TableHead className="text-right">km</TableHead>
              <TableHead>Monitoring window</TableHead>
              <TableHead className="text-right">r_Δh</TableHead>
              <TableHead>Class</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {windows.map((w) => (
              <TableRow key={w.station_id}>
                <TableCell className="font-medium">{stationName(w.station_id)}</TableCell>
                <TableCell className="text-right tabular">{fmtNum(w.distance_km, 0)}</TableCell>
                <TableCell>{windowText(w.window_days)}</TableCell>
                <TableCell className="text-right tabular">{fmtNum(w.r_delta_h ?? 0, 2)}</TableCell>
                <TableCell><QualityChip cls={w.quality_class} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {classes.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Reliability {classes.every((c) => c === "A") ? "A" : "A/B"} · n up to {Math.max(...(lags?.edges ?? []).map((e) => e.n_common_observations))} common days · suggested action: prioritise downstream monitoring in the indicated windows.
        </p>
      )}
      {edge && <EdgeDetail edge={edge} />}
      <p className="mt-2 text-xs italic text-muted-foreground">{NOT_ETA}</p>
    </div>
  );
}

function EdgeDetail({ edge: e }: { edge: DanubeEdge }) {
  return (
    <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        {stationName(e.from_station)} → {stationName(e.to_station)} <QualityChip cls={e.quality_class} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 tabular">
        <span>Distance {fmtNum(e.distance_km, 1)} km</span>
        <span>Common days n = {e.n_common_observations} (gaps {fmtNum(e.data_gap_rate * 100, 0)}%)</span>
        <span>Level lag {e.optimal_lag_days_level ?? "—"} d · r {fmtNum(e.r_level_optimal_lag ?? 0, 3)}</span>
        <span>Δh lag {e.optimal_lag_days_delta_h ?? "—"} d · r_Δh {fmtNum(e.r_delta_h ?? 0, 3)}</span>
        <span>Level r at lag 0: {fmtNum(e.r_level_lag0 ?? 0, 3)}</span>
        <span>Window: {windowText(e.monitoring_window_days)}</span>
      </div>
      {e.reason && <p className="mt-1 text-muted-foreground">{e.reason}</p>}
    </div>
  );
}

function AnomalyCard({ candidates, selected, onSelect, stats, date, threshold, days }: { candidates: TemperatureCandidateAnomaly[]; selected: string | null; onSelect: (id: string) => void; stats: AnomalyStationStats[]; date: string; threshold: number; days: string[] }) {
  const sorted = [...candidates].sort((a, b) => (a.model_output.role === b.model_output.role ? Math.abs(b.model_output.robust_z) - Math.abs(a.model_output.robust_z) : a.model_output.role === "primary" ? -1 : 1));
  const c = candidates.find((x) => x.observation.station_id === selected) ?? sorted.find((x) => x.model_output.role === "primary");
  const offset = c ? stats.find((s) => s.station_id === c.observation.station_id)?.baseline_median_c : undefined;
  return (
    <div className="rounded-lg border bg-card p-4">
      <CardTitle icon={AlertTriangle}>Temperature candidate anomaly</CardTitle>
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No candidate on {fmtDay(date)} (Bulgarian gauges, two-sided reference, threshold {threshold}).
          {days.length > 0 && <> Candidate days: {days.map((d) => fmtDay(`2025${d.slice(4)}`).replace(" 2025", "")).join(", ")}.</>}
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sorted.map((x) => (
              <button
                key={x.event_id}
                onClick={() => onSelect(x.observation.station_id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-semibold",
                  x.model_output.role === "primary" ? "border-attention/50 bg-attention-soft text-attention-foreground" : "border-border bg-muted text-muted-foreground",
                  c?.event_id === x.event_id && "ring-2 ring-navy",
                )}
              >
                {stationName(x.observation.station_id)} · z {fmtNum(x.model_output.robust_z, 1)}
                {x.model_output.role !== "primary" && " · influenced"}
              </button>
            ))}
          </div>
          {c && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>{stationName(c.observation.station_id)}</strong> · {fmtDay(date)} <ScenarioBadge className="ml-1 align-middle" />
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular">
                <span>Observed {fmtNum(c.observation.water_temp_c, 1)} °C</span>
                <span>Expected {fmtNum(c.model_output.expected_temp_c, 1)} °C</span>
                <span>Residual {signed(c.model_output.residual_c, 2)} °C</span>
                <span>Usual offset {signed(offset ?? null, 2)} °C</span>
                <span>Robust z {fmtNum(c.model_output.robust_z, 1)}</span>
                <span>Threshold {fmtNum(c.model_output.threshold, 0)} (proposed, demo tuning)</span>
              </div>
              <p className="text-xs text-muted-foreground">Expected from neighbouring stations: {c.model_output.neighbours.map(stationName).join(", ")} ({c.model_output.reference_type.replace("_", "-")} reference).</p>
              {c.model_output.role === "primary" ? (
                <p className="rounded-md border border-attention/40 bg-attention-soft px-2 py-1 font-semibold text-attention-foreground">
                  Candidate anomaly — investigation suggested.
                  {c.model_output.influenced.length > 0 && <span className="font-normal"> Also affects: {c.model_output.influenced.map(stationName).join(", ")} (neighbour-influenced).</span>}
                </p>
              ) : (
                <p className="rounded-md border bg-muted px-2 py-1 text-muted-foreground">Neighbour-influenced: lifted because {stationName(c.model_output.influenced_by ?? "")} is part of its reference. Not counted as a separate candidate.</p>
              )}
              <TemperatureChart stationId={c.observation.station_id} neighbours={c.model_output.neighbours} date={c.observation.date} />
              <p className="text-xs italic text-muted-foreground">No source attribution. Possible causes include local conditions, tributary inflow or sensor issues. Status: review required.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const SERIES_COLORS = ["var(--attention)", "var(--navy)", "var(--teal)"];

function TemperatureChart({ stationId, neighbours, date }: { stationId: string; neighbours: string[]; date: string }) {
  const ids = [stationId, ...neighbours];
  const results = useQueries({ queries: ids.map((id) => ({ queryKey: ["danube-series", id], queryFn: () => api().getDanubeSeries(id), staleTime: Infinity })) });
  const ready = results.every((r) => r.data);
  const data = useMemo(() => {
    if (!ready) return [];
    const t0 = toMs(date);
    const rows = new Map<number, Record<string, number>>();
    results.forEach((r, i) => {
      for (const p of r.data!.series) {
        const t = toMs(p.date);
        if (Math.abs(t - t0) > 15 * DAY || p.water_temp_c == null) continue;
        const row = rows.get(t) ?? { t };
        row[ids[i]!] = p.water_temp_c;
        rows.set(t, row);
      }
    });
    return [...rows.values()].sort((a, b) => a["t"]! - b["t"]!);
  }, [ready, date]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">Loading series…</div>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={(t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} fontSize={10} />
        <YAxis fontSize={10} unit="°" domain={["auto", "auto"]} />
        <Tooltip labelFormatter={(t) => new Date(Number(t)).toISOString().slice(0, 10)} formatter={(v) => `${fmtNum(Number(v), 1)} °C`} />
        <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => stationName(v)} />
        <ReferenceLine x={toMs(date)} stroke="var(--review)" strokeDasharray="4 4" />
        {ids.map((id, i) => (
          <Line key={id} dataKey={id} stroke={SERIES_COLORS[i] ?? "var(--teal)"} strokeWidth={i === 0 ? 2.5 : 1.5} dot={false} connectNulls={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function TributaryCard({ event: ev, error, pending, date, window: w, suggested, onCreate }: { event: TributaryInputEvent | null; error: Error | null; pending: boolean; date: string; window: { from: string | null; to: string | null } | undefined; suggested: { scenario_date: string; discharge_m3s: number; change_24h_m3s: number }[]; onCreate: (d: string) => void }) {
  const inWindow = !!w?.from && !!w.to && date >= w.from && date <= w.to;
  return (
    <div className="rounded-lg border bg-card p-4">
      <CardTitle icon={GitMerge}>Tributary input · Iskar</CardTitle>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CompatibilityChip state="SCENARIO-ALIGNED" />
        No native overlap with the Danube dataset (2021). Shared scenario window {w?.from ?? "…"} to {w?.to ?? "…"}.
      </div>
      {!ev && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!inWindow || pending} onClick={() => onCreate(date)}>
              Hand off Orehovitsa on {fmtDay(date)}
            </Button>
            {suggested.map((s) => (
              <Button key={s.scenario_date} size="sm" variant="outline" onClick={() => onCreate(s.scenario_date)}>
                {fmtDay(s.scenario_date).replace(" 2025", "")} · {fmtNum(s.discharge_m3s, 1)} m³/s ({signed(s.change_24h_m3s, 1)})
              </Button>
            ))}
          </div>
          {!inWindow && <p className="text-xs text-muted-foreground">This date is outside the shared window: there is no Danube scenario data to hand off to.</p>}
          {error && <p className="text-xs text-review">No event for this day: {/\(422\)/.test(error.message) ? "no Orehovitsa value that day (data gap) or outside the shared window" : error.message}.</p>}
        </div>
      )}
      {ev && (
        <div className="space-y-2 text-sm">
          <p>
            <strong>Iskar at {stationName(ev.observation.station_id)}</strong> · {fmtDay(ev.observation.source_date)} (native 2025 record) · {fmtNum(ev.observation.discharge_m3s, 1)} m³/s
            {ev.observation.change_24h_m3s != null && <>, {signed(ev.observation.change_24h_m3s, 1)} m³/s on the previous day</>}
          </p>
          <p className="text-xs text-muted-foreground">Handed off at the confluence node (Danube ~km {ev.confluence.river_km}). Downstream monitoring windows learned on Danube 2021 data <ScenarioBadge className="ml-1 align-middle" /></p>
          {ev.handoff.map((h) => (
            <div key={h.chain} className="rounded-md border p-2">
              <div className="mb-1 text-xs font-semibold">
                {h.chain === "bg_automatic" ? "BG chain" : "RO chain"} from {h.gauge_name} ({fmtNum(h.km_below_confluence, 0)} km below the confluence)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h.downstream_windows.map((x) => (
                  <span key={x.station_id} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
                    {stationName(x.station_id)} {windowText(x.window_days)} <QualityChip cls={x.quality_class} />
                  </span>
                ))}
                {h.excluded.map((x) => (
                  <span key={x.station_id} title={x.reason} className="inline-flex items-center gap-1 rounded border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground line-through">
                    {stationName(x.station_id)} <QualityChip cls={x.quality_class} />
                  </span>
                ))}
              </div>
            </div>
          ))}
          {ev.caveat && <p className="text-xs text-muted-foreground">{ev.caveat}</p>}
          <p className="text-xs">Suggested action: {ev.suggested_action.toLowerCase()}.</p>
          <p className="text-xs italic text-muted-foreground">{ev.note}</p>
        </div>
      )}
    </div>
  );
}
