import { Link } from "@tanstack/react-router";
import { Bot, Check, ChevronLeft, ChevronRight, Database, FileText, MapPin, PenLine, Satellite, UserCheck, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Event, ReviewAction } from "@/api/types";
import { useEvent, useEvents, useReviewEvent } from "@/hooks/use-mission";
import { cn } from "@/lib/utils";
import { fmtCoord, fmtDateUtc, fmtNum, fmtUtc, humanize, eventTitle, perspectiveLabel, reviewTone, systemSummary, uuid } from "@/lib/pn-format";
import { ConfidenceText, EventGlyph, ReviewBadge, SourceChip } from "./chips";
import { EvidenceFrame } from "./EvidenceFrame";

const LABELS = ["anthropogenic_debris", "submerged_debris", "surface_anomaly", "floating_vegetation", "natural_debris", "no_object"];

function Layer({ n, title, icon, source, children, tone = "default" }: { n: number; title: string; icon: ReactNode; source?: ReactNode; children: ReactNode; tone?: "default" | "ai" | "human" | "context" }) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card",
        tone === "ai" && "border-l-4 border-l-attention",
        tone === "human" && "border-l-4 border-l-teal",
        tone === "context" && "border-l-4 border-l-navy",
      )}
    >
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold text-navy-foreground">{n}</span>
        {icon}
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        <div className="ml-auto flex gap-1">{source}</div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Fact({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular">{v}</dd>
    </div>
  );
}

function ReviewControls({ event }: { event: Event }) {
  const review = useReviewEvent();
  const [mode, setMode] = useState<ReviewAction | null>(null);
  const [label, setLabel] = useState<string>("");
  const [note, setNote] = useState("");

  const submit = (action: ReviewAction) => {
    review.mutate(
      { id: event.event_id, body: { action, new_label: action === "relabel" ? label : undefined, note: note || undefined, reviewer: "demo-operator", request_id: uuid() } },
      { onSuccess: () => { setMode(null); setNote(""); } },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={() => submit("confirm")} disabled={review.isPending}>
          <Check aria-hidden /> Confirm
        </Button>
        <Button size="lg" variant="outline" onClick={() => submit("reject")} disabled={review.isPending}>
          <X aria-hidden /> Reject
        </Button>
        <Button size="lg" variant={mode === "relabel" ? "secondary" : "outline"} onClick={() => setMode(mode === "relabel" ? null : "relabel")}>
          <PenLine aria-hidden /> Relabel
        </Button>
      </div>
      {mode === "relabel" && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={label} onValueChange={setLabel}>
            <SelectTrigger className="h-10 w-64" aria-label="New label">
              <SelectValue placeholder="Choose new label" />
            </SelectTrigger>
            <SelectContent>
              {LABELS.filter((l) => l !== event.model_output.class).map((l) => (
                <SelectItem key={l} value={l}>{humanize(l)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="lg" disabled={!label || review.isPending} onClick={() => submit("relabel")}>Save relabel</Button>
        </div>
      )}
      <Textarea placeholder="Optional reviewer note (applies to the next action)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      {review.isError && <p className="text-sm text-review">Review could not be saved: {(review.error as Error).message}</p>}
    </div>
  );
}

export function EventDetailView({ eventId, onNavigate, onShowOnMap, compact }: { eventId: string; onNavigate: (id: string) => void; onShowOnMap: (id: string) => void; compact?: boolean }) {
  const { data: e, isLoading, error } = useEvent(eventId);
  const { data: list = [] } = useEvents();
  const idx = list.findIndex((x) => x.event_id === eventId);
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading event…</div>;
  if (error || !e) return <div className="p-8 text-review">Event not available: {(error as Error)?.message}</div>;

  const tone = reviewTone(e);
  const reviewed = e.review.status !== "unreviewed";
  const mo = e.model_output;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <EventGlyph perspective={e.perspective} tone={tone} confidence={mo.confidence} size={28} />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-muted-foreground tabular">{e.event_id} · {fmtDateUtc(e.captured_at)}</div>
          <h2 className="text-2xl font-bold">{eventTitle(e)}</h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <ReviewBadge tone={tone} />
            <SourceChip source={e.data_origin} />
            {e.attention_reasons.map((r) => (
              <span key={r} className="rounded-full border border-attention/40 bg-attention-soft px-2 py-0.5 text-xs font-medium text-attention-foreground">{humanize(r)}</span>
            ))}
          </div>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="outline" size="lg" disabled={!prev} onClick={() => prev && onNavigate(prev.event_id)} aria-label="Previous event"><ChevronLeft aria-hidden /> Prev</Button>
          <Button variant="outline" size="lg" disabled={!next} onClick={() => next && onNavigate(next.event_id)} aria-label="Next event">Next <ChevronRight aria-hidden /></Button>
          <Button variant="secondary" size="lg" onClick={() => onShowOnMap(e.event_id)}><MapPin aria-hidden /> Show on map</Button>
        </div>
      </div>

      <div className={cn("grid gap-4", !compact && "xl:grid-cols-[1.1fr_1fr]")}>
        <div className="space-y-4">
          <EvidenceFrame event={e} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
            <Fact k="Time" v={fmtUtc(e.captured_at)} />
            <Fact k="Coordinates" v={<>{fmtCoord(e.position.lat, e.position.lon)} <span className="text-muted-foreground">± {e.position.h_acc_m.toFixed(1)} m</span></>} />
            <Fact k="Perspective" v={perspectiveLabel(e.perspective)} />
            <Fact k="Class (AI)" v={humanize(mo.class)} />
            <Fact k="Confidence" v={<ConfidenceText value={mo.confidence} />} />
            <Fact k="Quality" v={<>{e.observation.quality_score.toFixed(2)}{e.observation.quality_flags?.length ? <span className="ml-1 text-attention-foreground">· {e.observation.quality_flags.map(humanize).join(", ")}</span> : null}</>} />
            <Fact k="Model version" v={`${mo.model_id} ${mo.model_version}`} />
            <Fact k="Data origin" v={<SourceChip source={e.data_origin} />} />
            <Fact k="Position source" v={<SourceChip source={e.position.source} />} />
          </dl>
        </div>

        <div className="space-y-3">
          <Layer n={1} title="PelaNode evidence" icon={<Satellite className="h-4 w-4" aria-hidden />} source={<SourceChip source={e.observation.evidence.provenance} />}>
            <dl className="grid grid-cols-2 gap-3">
              <Fact k="Observation" v={e.observation.observation_id} />
              <Fact k="Sensor" v={humanize(e.observation.source_sensor)} />
              <Fact k="Frame" v={e.observation.evidence.frame_uri ?? "Frame TBD"} />
              <Fact k="Device at capture" v={`Battery ${e.device.battery_pct}% · ${e.device.connectivity} · storage ${e.device.storage_pct}%`} />
            </dl>
          </Layer>

          <Layer n={2} title="AI-generated event" tone="ai" icon={<Bot className="h-4 w-4" aria-hidden />} source={<SourceChip source={mo.inference_origin} />}>
            <p className="mb-2 text-xs text-muted-foreground">Original model output — kept unchanged after human review.</p>
            <dl className="grid grid-cols-2 gap-3">
              <Fact k="Class" v={humanize(mo.class)} />
              <Fact k="Confidence" v={<ConfidenceText value={mo.confidence} />} />
              <Fact k="Bounding box (px)" v={mo.bbox ? mo.bbox.join(", ") : "—"} />
              <Fact k="Model" v={`${mo.model_id} v${mo.model_version} · ${mo.model_output_id}`} />
            </dl>
          </Layer>

          <Layer n={3} title="Human review" tone="human" icon={<UserCheck className="h-4 w-4" aria-hidden />} source={<ReviewBadge tone={tone} />}>
            {reviewed ? (
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-md bg-muted p-3">
                <Fact k="Decision" v={humanize(e.review.last_action)} />
                <Fact k="Current label" v={humanize(e.review.current_label)} />
                <Fact k="Reviewer" v={e.review.by ?? "—"} />
                <Fact k="At (mission time)" v={fmtUtc(e.review.at)} />
                {e.review.note && <div className="col-span-2"><Fact k="Note" v={e.review.note} /></div>}
                <div className="col-span-2 text-xs text-muted-foreground">Model said: <strong>{humanize(mo.class)}</strong> ({mo.confidence.toFixed(2)}) → Reviewer: <strong>{humanize(e.review.current_label ?? e.review.status)}</strong></div>
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">Not yet reviewed by an operator.</p>
            )}
            <div className="no-print"><ReviewControls event={e} /></div>
          </Layer>

          <Layer n={4} title="Associated dataset" tone="context" icon={<Database className="h-4 w-4" aria-hidden />} source={<SourceChip source="simulated" label="Simulated context" />}>
            <ul className="space-y-3">
              {e.context.map((c) => (
                <li key={c.dataset_id} className="rounded-md border p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{humanize(c.variable)}</span>
                    <span className="text-xl font-bold tabular">{fmtNum(c.value, c.unit === "m" ? 2 : 0)} <span className="text-sm font-medium">{c.unit}</span></span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular">
                    {c.dataset_id} · {c.provider} · {c.station_name} · {c.distance_km.toFixed(1)} km · {c.time_offset_min > 0 ? "+" : ""}{c.time_offset_min} min ({fmtUtc(c.observed_at, false)})
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <SourceChip source={c.provenance} />
                    <span className="font-semibold">{RELATION_LABEL[c.relation]} — association only, not cause</span>
                  </div>
                </li>
              ))}
            </ul>
          </Layer>

          <Layer n={5} title="System-generated summary" icon={<FileText className="h-4 w-4" aria-hidden />} source={<SourceChip source="simulated" label="Auto-text" />}>
            <p className="text-sm leading-relaxed">{systemSummary(e)}</p>
          </Layer>
        </div>
      </div>
      {compact && (
        <div className="no-print text-right">
          <Link to="/events/$eventId" params={{ eventId: e.event_id }} className="text-sm font-semibold text-teal underline-offset-4 hover:underline">Open full page →</Link>
        </div>
      )}
    </div>
  );
}
