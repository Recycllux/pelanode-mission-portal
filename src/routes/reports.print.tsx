import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/api";
import { SimulatedBadge, SourceChip, ReviewBadge } from "@/components/pn/chips";
import { Wordmark } from "@/components/pn/AppShell";
import { EvidenceFrame } from "@/components/pn/EvidenceFrame";
import { LazyMap } from "@/components/pn/LazyMap";
import { useEvents, useMissionContext, useReport, useTrack } from "@/hooks/use-mission";
import { eventTitle, fmtCoord, fmtDateUtc, fmtNum, fmtUtc, humanize, reviewTone, systemSummary } from "@/lib/pn-format";

export const Route = createFileRoute("/reports/print")({
  head: () => ({
    meta: [
      { title: "Printable mission report — PelaNode" },
      { name: "description", content: "Printable PelaNode mission report with evidence, associated context and provenance footer." },
      { property: "og:title", content: "Printable mission report — PelaNode" },
      { property: "og:description", content: "Printable PelaNode mission report (simulated demo data)." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrintReport,
});

function PrintReport() {
  const { data: r } = useReport();
  const { data: track = [] } = useTrack();
  const { data: summaries = [] } = useEvents();
  const { data: ctx } = useMissionContext();
  const full = useQueries({ queries: summaries.map((s) => ({ queryKey: ["event", s.event_id], queryFn: () => api().getEvent(s.event_id) })) });
  const events = full.map((q) => q.data).filter((e) => !!e);

  return (
    <div className="mx-auto max-w-[1000px] bg-card px-10 py-8 text-foreground">
      <div className="no-print mb-6 flex justify-between">
        <Link to="/reports" className="text-sm font-semibold text-teal hover:underline">← Back to Reports</Link>
        <Button onClick={() => window.print()}><Printer aria-hidden /> Print / save as PDF</Button>
      </div>

      <header className="flex items-start justify-between border-b-4 border-navy pb-4">
        <div>
          <Wordmark className="text-navy" />
          <h1 className="mt-4 text-3xl font-bold">Mission report: {r?.name}</h1>
          <p className="mt-1 text-muted-foreground tabular">{r?.mission_id} · Period {r && fmtDateUtc(r.period_start)} – {r && fmtUtc(r.period_end, false)} · data up to {fmtUtc(r?.until)}</p>
        </div>
        <SimulatedBadge className="text-sm" />
      </header>

      <p className="mt-4 rounded-md border border-sim-foreground/30 bg-sim/40 p-3 text-sm">
        All data in this report is simulated or replayed for a demonstration. Contextual values are associations in time and space — they coincide with events and do not indicate a cause.
      </p>

      <section className="mt-6 grid grid-cols-5 gap-3 text-center">
        {[["Observations", r?.observations], ["Events", r?.events], ["Review required", r?.review_required], ["Reviewed", r?.reviewed], ["Path", r ? `${r.path_length_km.toFixed(2)} km` : "—"]].map(([k, v]) => (
          <div key={k as string} className="rounded-md border p-3"><div className="text-2xl font-bold tabular">{v as string}</div><div className="text-xs text-muted-foreground">{k as string}</div></div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Map snapshot <SourceChip source="replayed" /></h2>
        <div className="isolate h-[380px] overflow-hidden rounded-lg border">
          <LazyMap track={track} events={summaries} interactive={false} fitAll />
        </div>
      </section>

      <section className="mt-8 space-y-6">
        <h2 className="text-lg font-bold">Events</h2>
        {events.length === 0 && <p className="text-muted-foreground">No events up to this mission time.</p>}
        {events.map((e) => (
          <article key={e.event_id} className="break-inside-avoid rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{e.event_id} · {eventTitle(e)}</h3>
              <ReviewBadge tone={reviewTone(e)} />
            </div>
            <div className="mt-3 grid grid-cols-[320px_1fr] gap-4">
              <EvidenceFrame event={e} />
              <div className="space-y-2 text-sm">
                <p className="tabular">{fmtUtc(e.captured_at)} · {fmtCoord(e.position.lat, e.position.lon)} ± {e.position.h_acc_m} m · {e.perspective === "above" ? "above water" : "below water"}</p>
                <p>AI output: <strong>{humanize(e.model_output.class)}</strong>, confidence {e.model_output.confidence.toFixed(2)} ({e.model_output.model_id} {e.model_output.model_version}, {e.model_output.inference_origin})</p>
                <p>Human review: {humanize(e.review.status)}{e.review.current_label ? ` → ${humanize(e.review.current_label)}` : ""}{e.review.by ? ` by ${e.review.by}` : ""}</p>
                <ul className="list-disc pl-5">
                  {e.context.map((c) => (
                    <li key={c.dataset_id}>{RELATION_LABEL[c.relation]} {humanize(c.variable).toLowerCase()} {fmtNum(c.value, c.unit === "m" ? 2 : 0)} {c.unit} — {c.station_name}, {c.distance_km} km, {c.time_offset_min} min · source {c.provider} ({c.provenance}) — association only, not cause</li>
                  ))}
                </ul>
                <p className="text-muted-foreground">{systemSummary(e)}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">Context datasets</h2>
        <ul className="text-sm">
          {ctx?.datasets.map((d) => <li key={d.dataset_id}>{d.dataset_id} — {d.provider}, {d.station_name}, {humanize(d.variable)} ({d.unit}) · {d.label}</li>)}
        </ul>
      </section>

      <footer className="mt-10 border-t-2 border-navy pt-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Provenance</strong> · Data origin: {r?.data_origin} · Model: {r?.model_versions.join(", ")} · Datasets: {r?.datasets.map((d) => `${d.dataset_id} (${d.provenance})`).join(", ")} · Generated: {r && fmtDateUtc(r.generated_at)}
      </footer>
    </div>
  );
}
