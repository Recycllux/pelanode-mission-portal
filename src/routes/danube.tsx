import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Navigation, Waves } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type DanubeAlert, type DanubeForecast } from "@/api";
import { AppShell } from "@/components/pn/AppShell";
import { SourceChip } from "@/components/pn/chips";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MISSION_ID } from "@/hooks/use-mission";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/danube")({
  head: () => ({
    meta: [
      { title: "Danube Forecast — PelaNode Intelligence Portal" },
      { name: "description", content: "Low-water and flood-wave forecast for the Ruse–Giurgiu reach from upstream Danube gauges, with PelaNode deployment triggers." },
      { property: "og:title", content: "Danube Forecast — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Low-water and flood-wave forecast for the Ruse–Giurgiu reach, organiser data 2021." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DanubePage,
});

const DAY = 86_400_000;
const FIRST = "2021-07-12";
const LAST = "2021-11-09";
const PRESETS = [
  { date: "2021-07-20", label: "Summer recession" },
  { date: "2021-10-01", label: "Low-water warning" },
  { date: LAST, label: "Latest data" },
];
const IRON_GATE_KM = 943;

const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fmtDay = (d: string | number) =>
  new Date(typeof d === "number" ? d : toMs(d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const cm = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)} cm`);

function useDanube(asOf: string) {
  const forecast = useQuery({
    queryKey: ["danube-forecast", asOf],
    queryFn: () => api().getDanubeForecast(MISSION_ID, asOf),
    placeholderData: keepPreviousData,
  });
  const station = forecast.data?.station.station_id;
  const profile = useQuery({
    queryKey: ["danube-profile", asOf],
    queryFn: () => api().getDanubeProfile(asOf),
    placeholderData: keepPreviousData,
  });
  const series = useQuery({
    queryKey: ["danube-series", station],
    queryFn: () => api().getDanubeSeries(station!),
    enabled: !!station,
  });
  const backtest = useQuery({
    queryKey: ["danube-backtest", station],
    queryFn: () => api().getDanubeBacktest(station!),
    enabled: !!station,
  });
  return { forecast, profile, series, backtest };
}

function DanubePage() {
  const [asOf, setAsOf] = useState("2021-10-01");
  const [slider, setSlider] = useState(toMs(asOf));
  const { forecast, profile, series, backtest } = useDanube(asOf);
  const f = forecast.data;

  const pick = (d: string) => {
    setAsOf(d);
    setSlider(toMs(d));
  };

  return (
    <AppShell screen="Danube Forecast">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Danube level forecast · {f ? `${f.station.name} (km ${f.station.river_km})` : "…"}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <SourceChip source="organiser" label="Organiser data · 2021" />
              Forecast for the reach of mission {MISSION_ID}, from {f?.model.predictors.length ?? "…"} upstream gauges. Data replayed as of a past date.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.date} variant={asOf === p.date ? "default" : "outline"} onClick={() => pick(p.date)}>
                {p.label} · {fmtDay(p.date)}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">Forecast issued on {fmtDay(toDate(slider))} 2021</span>
            <span className="text-muted-foreground">Drag to replay any day from {fmtDay(FIRST)} to {fmtDay(LAST)}</span>
          </div>
          <Slider
            min={toMs(FIRST)}
            max={toMs(LAST)}
            step={DAY}
            value={[slider]}
            onValueChange={(v) => setSlider(v[0]!)}
            onValueCommit={(v) => setAsOf(toDate(v[0]!))}
            aria-label="Forecast issue date"
          />
        </div>

        {forecast.isError && <p className="text-sm text-review">Forecast unavailable: {(forecast.error as Error).message}</p>}

        {f && <SummaryCards f={f} />}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Level at {f?.station.name ?? "…"}: observed, forecast and what actually happened</h2>
            <p className="mb-3 text-xs text-muted-foreground">Shaded band is about 80% of past forecast errors. Dashed grey shows the observations after the issue date, for checking.</p>
            {f && series.data ? <ForecastChart f={f} series={series.data.series} /> : <ChartPlaceholder />}
          </div>
          <div className="space-y-6">
            <Drivers f={f} />
            <Skill data={backtest.data} />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">The whole Danube on {fmtDay(asOf)}: level against each gauge's usual level</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Bars show cm above or below each gauge's median (2021 record), ordered from Germany (left) to the Black Sea (right). A high-water pulse shows as teal bars moving right as you replay the days.
          </p>
          {profile.data ? <ProfileChart points={profile.data.points} target={f?.station.name ?? null} /> : <ChartPlaceholder />}
        </div>

        {f && (
          <p className="text-xs text-muted-foreground">
            Source: {f.source}. Thresholds: {f.thresholds.basis}. Model: {f.model.method}; trained on {f.model.training_rows} days ({f.model.training_from} to {f.model.training_to}). Station positions are approximate.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function ChartPlaceholder() {
  return <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
}

const ALERT_STYLE: Record<DanubeAlert["type"], { label: string; cls: string; Icon: typeof AlertTriangle }> = {
  low_water: { label: "Low water", cls: "border-attention/40 bg-attention-soft text-attention-foreground", Icon: ArrowDownRight },
  high_water: { label: "High water", cls: "border-review/40 bg-review-soft text-review", Icon: Waves },
  rapid_rise: { label: "Rapid rise", cls: "border-review/40 bg-review-soft text-review", Icon: ArrowUpRight },
  rapid_fall: { label: "Rapid fall", cls: "border-attention/40 bg-attention-soft text-attention-foreground", Icon: ArrowDownRight },
};

function SummaryCards({ f }: { f: DanubeForecast }) {
  const last = f.forecast[f.forecast.length - 1]!;
  const change = last.level_cm - f.observed_level_cm;
  const rec = f.recommendation;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm text-muted-foreground">Observed {fmtDay(f.as_of)}</div>
        <div className="text-3xl font-bold tabular">{cm(f.observed_level_cm)}</div>
        <div className="mt-1 text-xs text-muted-foreground">Low-water mark {cm(f.thresholds.low_cm)} · high-water mark {cm(f.thresholds.high_cm)}</div>
      </div>
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm text-muted-foreground">Forecast {fmtDay(last.date)} (+{last.horizon_days} days)</div>
        <div className="text-3xl font-bold tabular">
          {cm(last.level_cm)} <span className={cn("text-lg", change < 0 ? "text-attention" : "text-teal")}>{change >= 0 ? "+" : ""}{Math.round(change)}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Range {cm(last.band_low_cm)} to {cm(last.band_high_cm)}
          {last.observed_cm != null && <> · actually {cm(last.observed_cm)}</>}
        </div>
      </div>
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm text-muted-foreground">Alerts in the next {last.horizon_days} days</div>
        {f.alerts.length === 0 ? (
          <div className="mt-1 text-lg font-semibold text-teal">None</div>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {f.alerts.map((a) => {
              const s = ALERT_STYLE[a.type];
              return (
                <li key={a.type} className={cn("flex items-center gap-2 rounded-md border px-2 py-1 text-sm font-semibold", s.cls)}>
                  <s.Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {s.label} in {a.eta_days} {a.eta_days === 1 ? "day" : "days"} ({fmtDay(a.date)})
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className={cn("rounded-lg border p-5", rec.action === "routine" ? "bg-card" : "border-teal/40 bg-teal-soft")}>
        <div className="flex items-center gap-2 text-sm font-semibold text-teal">
          <Navigation className="h-4 w-4" aria-hidden /> PelaNode trigger
        </div>
        <p className="mt-1 text-sm font-medium">{rec.text}</p>
        {rec.action !== "routine" && (
          <Button asChild size="sm" className="mt-3">
            <Link to="/">Open mission {MISSION_ID}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

type Row = { t: number; observed?: number; after?: number; forecast?: number; band?: [number, number] };

function ForecastChart({ f, series }: { f: DanubeForecast; series: { date: string; level_cm: number | null }[] }) {
  const issued = toMs(f.as_of);
  const data = useMemo(() => {
    const rows = new Map<number, Row>();
    const from = issued - 30 * DAY;
    const to = issued + (f.forecast.length + 1) * DAY;
    for (const p of series) {
      const t = toMs(p.date);
      if (t < from || t > to || p.level_cm == null) continue;
      rows.set(t, t <= issued ? { t, observed: p.level_cm } : { t, after: p.level_cm });
    }
    const start = rows.get(issued) ?? { t: issued };
    start.forecast = f.observed_level_cm;
    start.after = f.observed_level_cm;
    start.band = [f.observed_level_cm, f.observed_level_cm];
    rows.set(issued, start);
    for (const p of f.forecast) {
      const t = toMs(p.date);
      const row = rows.get(t) ?? { t };
      row.forecast = p.level_cm;
      if (p.band_low_cm != null && p.band_high_cm != null) row.band = [p.band_low_cm, p.band_high_cm];
      rows.set(t, row);
    }
    return [...rows.values()].sort((a, b) => a.t - b.t);
  }, [f, series, issued]);

  return (
    <ResponsiveContainer width="100%" height={440}>
      <ComposedChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t) => fmtDay(Number(t))} stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} unit=" cm" width={70} />
        <Tooltip
          labelFormatter={(t) => `${fmtDay(Number(t))} 2021`}
          formatter={(v, name) => [Array.isArray(v) ? `${v[0]} to ${v[1]} cm` : `${v} cm`, name]}
        />
        <Legend />
        <Area dataKey="band" name="Forecast range" stroke="none" fill="var(--attention)" fillOpacity={0.15} isAnimationActive={false} />
        <Line dataKey="observed" name="Observed" stroke="var(--navy)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line dataKey="after" name="Observed later (check)" stroke="var(--lowconf)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        <Line dataKey="forecast" name="Forecast" stroke="var(--attention)" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
        {f.thresholds.low_cm != null && (
          <ReferenceLine y={f.thresholds.low_cm} stroke="var(--attention)" strokeDasharray="6 3" label={{ value: "Low-water mark", position: "insideBottomLeft", fontSize: 11, fill: "var(--attention-foreground)" }} />
        )}
        {f.thresholds.high_cm != null && (
          <ReferenceLine y={f.thresholds.high_cm} stroke="var(--review)" strokeDasharray="6 3" label={{ value: "High-water mark", position: "insideTopLeft", fontSize: 11, fill: "var(--review)" }} />
        )}
        <ReferenceLine x={issued} stroke="var(--foreground)" label={{ value: "Issued", position: "top", fontSize: 11 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ProfileChart({ points, target }: { points: { name: string; country: string; river_km: number; anomaly_cm: number; level_cm: number; change_24h_cm: number | null }[]; target: string | null }) {
  const ironGate = points.find((p) => p.river_km > IRON_GATE_KM && p.river_km < IRON_GATE_KM + 20)?.name;
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={points} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" interval={0} angle={-55} textAnchor="end" height={90} stroke="var(--muted-foreground)" fontSize={10} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} unit=" cm" width={70} />
        <Tooltip
          labelFormatter={(name) => {
            const p = points.find((x) => x.name === name);
            return p ? `${p.name} (${p.country}) · km ${p.river_km}` : String(name);
          }}
          formatter={(v, _n, item) => {
            const p = item.payload as (typeof points)[number];
            return [`${Number(v) >= 0 ? "+" : ""}${v} cm vs usual · level ${p.level_cm} cm · 24 h ${p.change_24h_cm ?? "—"} cm`, "Anomaly"];
          }}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Bar dataKey="anomaly_cm" isAnimationActive={false}>
          {points.map((p) => (
            <Cell key={p.name} fill={p.anomaly_cm >= 0 ? "var(--teal)" : "var(--attention)"} />
          ))}
        </Bar>
        {ironGate && <ReferenceLine x={ironGate} stroke="var(--navy)" strokeDasharray="4 4" label={{ value: "Iron Gates dam", position: "top", fontSize: 11, fill: "var(--navy)" }} />}
        {target && <ReferenceLine x={target} stroke="var(--review)" strokeWidth={2} label={{ value: `PelaNode ${MISSION_ID}`, position: "top", fontSize: 11, fill: "var(--review)" }} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Drivers({ f }: { f: DanubeForecast | undefined }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Why: upstream gauges driving this forecast</h2>
      {!f || f.drivers.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {f.drivers.map((d) => (
            <li key={d.station_id} className="flex justify-between gap-2">
              <span>{d.name} <span className="text-muted-foreground">km {Math.round(d.river_km)}</span></span>
              <span className={cn("font-semibold tabular", d.contribution_cm < 0 ? "text-attention" : "text-teal")}>
                {d.contribution_cm >= 0 ? "+" : ""}{d.contribution_cm} cm
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Skill({ data }: { data: Awaited<ReturnType<ReturnType<typeof api>["getDanubeBacktest"]>> | undefined }) {
  const lows = data?.threshold_crossings.filter((c) => c.type === "low_water") ?? [];
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Track record (backtest, Jul to Nov 2021)</h2>
      <p className="mb-2 text-xs text-muted-foreground">Every forecast trained only on data available on its issue date. Compared with assuming "no change".</p>
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Days ahead</TableHead>
                <TableHead className="text-right">Error</TableHead>
                <TableHead className="text-right">No-change error</TableHead>
                <TableHead className="text-right">Better by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.skill.map((s) => (
                <TableRow key={s.horizon_days}>
                  <TableCell>{s.horizon_days}</TableCell>
                  <TableCell className="text-right tabular">{s.mae_model_cm} cm</TableCell>
                  <TableCell className="text-right tabular text-muted-foreground">{s.mae_persistence_cm} cm</TableCell>
                  <TableCell className="text-right font-semibold tabular text-teal">{s.improvement_pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lows.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {lows.map((c) => (
                <li key={c.observed_on}>
                  Low water on <b>{fmtDay(c.observed_on)}</b>: {c.warned_days_ahead ? <>warned <b>{c.warned_days_ahead} days</b> ahead</> : "not warned"}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
