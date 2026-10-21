import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EventSummary, MissionContext } from "@/api/types";
import { fmtUtc } from "@/lib/pn-format";
import { SourceChip } from "./chips";

export function ContextChart({ context, events, until, missionStart, missionEnd, height = 220, onSelectEvent }: { context?: MissionContext | undefined; events: EventSummary[]; until?: string | undefined; missionStart?: string | undefined; missionEnd?: string | undefined; height?: number; onSelectEvent?: (id: string) => void }) {
  const u = until ? Date.parse(until) : Infinity;
  const byTime = new Map<number, { t: number; discharge?: number; level?: number }>();
  for (const r of context?.records ?? []) {
    const t = Date.parse(r.observed_at);
    if (t > u) continue;
    const row = byTime.get(t) ?? { t };
    if (r.variable === "discharge") row.discharge = r.value;
    else row.level = r.value;
    byTime.set(t, row);
  }
  const data = [...byTime.values()].sort((a, b) => a.t - b.t);
  const ds = context?.datasets ?? [];
  const domain: [number, number] = [Date.parse("2026-10-24T08:22:00Z"), Date.parse("2026-10-24T15:22:00Z")];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide">Environmental context</h3>
        <SourceChip source="simulated" label="Simulated context" />
        <span className="text-xs text-muted-foreground">{ds.map((d) => `${d.dataset_id} (${d.provider}, ${d.station_name})`).join(" · ")}</span>
        <span className="ml-auto text-xs text-muted-foreground">Event markers show timing only — values coincide, they do not explain.</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="t" type="number" domain={domain} scale="time" tickFormatter={(t) => new Date(t).toISOString().slice(11, 16)} stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis yAxisId="q" stroke="var(--teal)" fontSize={12} domain={[700, 1300]} label={{ value: "m3/s", angle: -90, position: "insideLeft", fill: "var(--teal)", fontSize: 12 }} />
          <YAxis yAxisId="h" orientation="right" stroke="var(--navy)" fontSize={12} domain={[4, 5.5]} label={{ value: "m", angle: 90, position: "insideRight", fill: "var(--navy)", fontSize: 12 }} />
          <Tooltip labelFormatter={(t) => `${fmtUtc(new Date(Number(t)).toISOString(), false)} · SIMULATED`} />
          <Legend />
          {missionStart && missionEnd && <ReferenceArea yAxisId="q" x1={Date.parse(missionStart)} x2={Date.parse(missionEnd)} fill="var(--attention)" fillOpacity={0.08} label={{ value: "Mission", fill: "var(--attention-foreground)", fontSize: 11, position: "insideTop" }} />}
          <Line yAxisId="q" type="monotone" dataKey="discharge" name="Discharge (m3/s) · simulated" stroke="var(--teal)" strokeWidth={2.5} dot />
          <Line yAxisId="h" type="monotone" dataKey="level" name="Water level (m) · simulated" stroke="var(--navy)" strokeWidth={2.5} dot strokeDasharray="5 3" />
          {events.map((e) => (
            <ReferenceLine key={e.event_id} yAxisId="q" x={Date.parse(e.captured_at)} stroke={e.attention === "review_required" && e.review.status === "unreviewed" ? "var(--review)" : "var(--lowconf)"} strokeWidth={2} label={{ value: e.event_id, fontSize: 10, fill: "var(--navy)", position: "top" }} onClick={() => onSelectEvent?.(e.event_id)} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
