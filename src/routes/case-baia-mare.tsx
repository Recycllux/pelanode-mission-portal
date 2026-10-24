import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, Pause, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/pn/AppShell";
import { LazyCaseMap } from "@/components/pn/LazyMap";
import type { CaseMapPoint } from "@/components/pn/MissionMap";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EVENTS,
  HISTORY_ALERT_H,
  LIMIT_MG_L,
  PELANODE_ALERT_H,
  PELANODE_NODE,
  PLUME_PATH,
  POINTS,
  SCENARIO_HOURS,
  SOURCES,
  SPILL_LABEL,
  clockLabel,
  leadHours,
  plumeFront,
  type CaseEvent,
  type Lane,
} from "@/data/baia-mare-2000";
import { fmtNum } from "@/lib/pn-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/case-baia-mare")({
  head: () => ({
    meta: [
      { title: "Case study: Baia Mare 2000 — PelaNode Intelligence Portal" },
      { name: "description", content: "The 2000 Baia Mare cyanide spill on its documented timeline, and what an earlier shared warning would have changed downstream." },
      { property: "og:title", content: "Case study: Baia Mare 2000 — PelaNode" },
      { property: "og:description", content: "Documented history of the 2000 cyanide spill on the Someș, Tisza and Danube, with an illustrative PelaNode scenario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BaiaMareCase,
});

const STEP_H = 1;
const TICK_MS = 120;
const KEY_POINTS = ["aurul", "csenger", "szolnok", "szeged"];

function Badge({ children, tone = "navy" }: { children: string; tone?: "navy" | "sim" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone === "navy" ? "border-navy/30 bg-navy-soft text-navy" : "border-sim-foreground/30 bg-sim/60 text-sim-foreground",
      )}
    >
      {children}
    </span>
  );
}

// Day 0 is 30 Jan (the breach at 22:00), so the day number follows the calendar date.
const dayOf = (h: number) => Math.floor((h + 22) / 24);
const fmtLead = (h: number | null) => (h == null ? "—" : h < 0 ? "after arrival" : h >= 48 ? `${fmtNum(h / 24, 1)} days` : `${fmtNum(h, 0)} h`);

function BaiaMareCase() {
  const [hours, setHours] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lane, setLane] = useState<Lane>("pelanode");

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setHours((x) => (x + STEP_H >= SCENARIO_HOURS ? SCENARIO_HOURS : x + STEP_H)), TICK_MS);
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    if (hours >= SCENARIO_HOURS) setPlaying(false);
  }, [hours]);

  const front = useMemo(() => plumeFront(hours), [hours]);
  const alertAt = lane === "history" ? HISTORY_ALERT_H : PELANODE_ALERT_H;
  const warned = hours >= alertAt;

  const mapPoints: CaseMapPoint[] = POINTS.map((p) => {
    const reached = p.arrival_h != null && hours >= p.arrival_h;
    const state: CaseMapPoint["state"] = p.id === "aurul" ? "source" : reached ? "reached" : warned && (lane === "pelanode" || p.country !== "RO") ? "warned" : "unaware";
    const lead = leadHours(p, lane);
    const label =
      p.id === "aurul"
        ? `breach ${SPILL_LABEL}`
        : reached
          ? `${p.arrival_label}${p.peak_mg_l != null ? ` · ${fmtNum(p.peak_mg_l, 2)} mg/l` : ""}`
          : state === "warned"
            ? `warned · plume in ${fmtLead(p.arrival_h! - hours)}`
            : p.arrival_h == null
              ? p.arrival_label
              : lead != null && lead > 0 && !warned
                ? "no warning yet"
                : "not yet reached";
    return { id: p.id, name: p.name, lat: p.lat, lon: p.lon, state, label, permanent: KEY_POINTS.includes(p.id) };
  });

  return (
    <AppShell screen="Case study · Baia Mare 2000">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-4 sm:px-6 sm:py-6">
        <div className="max-w-4xl">
          <h1 className="text-xl font-bold sm:text-2xl">Baia Mare cyanide spill, 2000 · days of preparation instead of hours</h1>
          <p className="mt-1 text-sm">
            In 2000 the pollution was measured within a day, but the formal alarm reached Hungary about 23 h after the breach, and the plume crossed the border 19 h later. PelaNode would not have stopped the release; a node below the pond and one shared, reviewed event would have given every place downstream the same warning from the first hours.
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge>Documented history 2000</Badge>
            <Badge tone="sim">Illustrative PelaNode scenario</Badge>
            Runs in the browser · no live or organiser data
          </p>
        </div>

        <CauseCard />

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => (hours >= SCENARIO_HOURS ? (setHours(0), setPlaying(true)) : setPlaying(!playing))} className="w-32">
              {playing ? <Pause aria-hidden /> : hours >= SCENARIO_HOURS ? <RotateCcw aria-hidden /> : <Play aria-hidden />}
              {playing ? "Pause" : hours >= SCENARIO_HOURS ? "Restart" : "Play"}
            </Button>
            <div>
              <div className="text-lg font-bold tabular">
                Day {dayOf(hours)} · {clockLabel(hours)}
              </div>
              <div className="text-xs text-muted-foreground">+{fmtNum(hours, 0)} h after the breach</div>
            </div>
            <div className="ml-auto inline-flex rounded-md border p-0.5" role="tablist" aria-label="Map view">
              {(["history", "pelanode"] as const).map((l) => (
                <button
                  key={l}
                  role="tab"
                  aria-selected={lane === l}
                  onClick={() => setLane(l)}
                  className={cn("rounded px-3 py-1.5 text-sm font-medium", lane === l ? "bg-navy text-navy-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  {l === "history" ? "What happened" : "With PelaNode"}
                </button>
              ))}
            </div>
          </div>
          <Slider min={0} max={SCENARIO_HOURS} step={STEP_H} value={[hours]} onValueChange={(v) => setHours(v[0]!)} aria-label="Hours after the breach" />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Day 0 · 30 Jan</span>
            <span>Day 14 · 13 Feb</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[3fr_2fr]">
          <div className="space-y-2">
            <div className="h-[380px] overflow-hidden rounded-lg border sm:h-[520px] xl:h-[600px]">
              <LazyCaseMap
                path={PLUME_PATH}
                front={front.path}
                frontDated={front.dated}
                points={mapPoints}
                node={lane === "pelanode" ? { ...PELANODE_NODE, active: hours >= 2 } : null}
              />
            </div>
            <MapLegend />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <LaneLog lane="history" hours={hours} active={lane === "history"} />
            <LaneLog lane="pelanode" hours={hours} active={lane === "pelanode"} />
          </div>
        </div>

        <LeadTable />
        <SourcesCard />
      </div>
    </AppShell>
  );
}

function CauseCard() {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 md:grid-cols-[320px_1fr]">
      <figure className="relative overflow-hidden rounded-md border bg-muted">
        <img src="/case/baia-mare-illustration.svg" alt="Schematic illustration of a breached tailings dam releasing water into a stream on a winter night" className="aspect-[4/3] w-full object-cover" loading="lazy" />
        <figcaption className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">AI-generated schematic illustration · not a photo</figcaption>
      </figure>
      <div className="space-y-2 text-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 text-review" aria-hidden /> Cause and effects
        </h2>
        <p>
          <strong>{SPILL_LABEL}.</strong> With 60–70 cm of snow on the Aurul tailings pond, 30 l/m² of rain and temperatures above 0 °C, the pond overflowed and a ~25 m breach opened in the dam. About 100,000 m³ of water with free and complexed cyanide reached the Lăpuș and the Someș.
        </p>
        <p>
          The plume entered Hungary at 32.6 mg/l, {fmtNum(32.6 / LIMIT_MG_L, 0)} times the 0.1 mg/l limit for drinking water, and was still at 1.49 mg/l when it left Hungary 12 days later. Hungary estimated 100–120 t of dissolved cyanide in the wave; plankton died almost entirely in the Someș and the upper Tisza, and dead fish were reported from 2 Feb.
        </p>
        <p className="text-xs text-muted-foreground">Dates, concentrations and quantities are from the sources below. The dead-fish tonnage and the exact date the plume entered the Danube are not in them and are not shown.</p>
      </div>
    </div>
  );
}

const TONE: Record<CaseEvent["tone"], string> = {
  neutral: "border-border",
  warning: "border-attention",
  critical: "border-review",
  success: "border-teal",
};

function LaneLog({ lane, hours, active }: { lane: Lane; hours: number; active: boolean }) {
  const items = EVENTS.filter((e) => e.lane === lane && e.at_h <= hours);
  const Icon = lane === "history" ? BookOpen : ShieldCheck;
  return (
    <div className={cn("rounded-lg border bg-card p-4", !active && "opacity-80")}>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" aria-hidden /> {lane === "history" ? "What happened (documented)" : "With PelaNode (illustrative)"}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {lane === "history"
          ? "Formal alarm to Hungary at +23 h."
          : "Assumptions: node a few km below the pond, anomaly flagged at +2 h from camera evidence, confirmed and shared at +2.5 h. Arrival times are the documented 2000 ones."}
      </p>
      <ol className="space-y-2">
        {items.length === 0 && <li className="text-sm text-muted-foreground">Nothing yet.</li>}
        {[...items].reverse().map((e) => (
          <li key={`${e.lane}-${e.at_h}-${e.title}`} className={cn("border-l-4 pl-3", TONE[e.tone])}>
            <div className="text-xs text-muted-foreground tabular">
              Day {dayOf(e.at_h)} · {clockLabel(e.at_h)}
            </div>
            <div className="text-sm font-medium">{e.title}</div>
            {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function MapLegend() {
  const dot = (c: string) => <span className="inline-block h-3 w-3 rounded-full border-2 border-navy" style={{ background: c }} />;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">{dot("var(--review)")} plume has passed</span>
      <span className="flex items-center gap-1.5">{dot("var(--attention)")} warned, plume still to come</span>
      <span className="flex items-center gap-1.5">{dot("var(--card)")} no warning yet</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-5 rounded bg-review" /> plume, interpolated between documented peak times
      </span>
      <span>Path and positions are schematic (Natural Earth rivers, approximate coordinates).</span>
    </div>
  );
}

function LeadTable() {
  const rows = POINTS.filter((p) => p.arrival_h != null && p.arrival_h > 0);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 font-semibold">Hours of preparation downstream</h2>
      <p className="mb-3 text-xs text-muted-foreground">Time from the warning to the documented peak at each place. 2000: formal alarm at +23 h. With PelaNode: shared event at +2.5 h (assumption). Same plume, same arrival times.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Place</TableHead>
            <TableHead>Documented peak</TableHead>
            <TableHead className="text-right">Peak (mg/l CN)</TableHead>
            <TableHead className="text-right">× limit</TableHead>
            <TableHead className="text-right">Warning in 2000</TableHead>
            <TableHead className="text-right">With PelaNode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.river}</div>
                {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
              </TableCell>
              <TableCell className="tabular">{p.arrival_label}</TableCell>
              <TableCell className="text-right tabular">{p.peak_mg_l != null ? fmtNum(p.peak_mg_l, 2) : "—"}</TableCell>
              <TableCell className="text-right tabular">{p.peak_mg_l != null ? `${fmtNum(p.peak_mg_l / LIMIT_MG_L, 0)}×` : "—"}</TableCell>
              <TableCell className="text-right tabular">{fmtLead(leadHours(p, "history"))}</TableCell>
              <TableCell className="text-right font-semibold tabular text-teal">{fmtLead(leadHours(p, "pelanode"))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-xs text-muted-foreground">
        Limit: 0.1 mg/l (Hungarian drinking-water and surface-water limit; EU 98/83/EC: 0.05 mg/l). Arrival windows are documented travel times from 2000, not a PelaNode prediction: our propagation model covers only the lower Danube.
      </p>
    </div>
  );
}

function SourcesCard() {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h2 className="mb-2 font-semibold">Sources</h2>
      <ul className="list-disc space-y-1 pl-5">
        {SOURCES.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Where the Hungarian evaluation gives two times for one peak (Balsa, Szolnok) the text time is used and the table time is noted.</p>
    </div>
  );
}
