import { useQueries } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/api";
import type { Event } from "@/api/types";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/pn/AppShell";
import { ConfidenceText, ReviewBadge, SourceChip } from "@/components/pn/chips";
import { EvidenceFrame } from "@/components/pn/EvidenceFrame";
import { useEvents, useMissionTime } from "@/hooks/use-mission";
import { cn } from "@/lib/utils";
import { eventTitle, fmtCoord, fmtUtc, reviewTone } from "@/lib/pn-format";

export const Route = createFileRoute("/dual-vision")({
  head: () => ({
    meta: [
      { title: "Dual Vision — PelaNode Intelligence Portal" },
      { name: "description", content: "Surface and underwater camera views of each PelaNode event, side by side." },
      { property: "og:title", content: "Dual Vision — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Compare above-water and below-water evidence for every AI-generated event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DualVisionPage,
});

function DualVisionPage() {
  const { data: summaries = [] } = useEvents();
  const until = useMissionTime();
  const full = useQueries({
    queries: summaries.map((s) => ({ queryKey: ["event", s.event_id], queryFn: () => api().getEvent(s.event_id) })),
  });
  const events = full.map((q) => q.data).filter((e): e is Event => !!e);

  return (
    <AppShell screen="Dual Vision">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Dual Vision</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Each event seen by both PelaNode cameras at the same moment: surface camera on the left, underwater camera on the right. The AI box is drawn on the camera that raised the event.
            </p>
          </div>
          <span className="ml-auto text-sm text-muted-foreground tabular">{summaries.length} events up to {fmtUtc(until)}</span>
        </div>

        {summaries.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No events yet at this mission time. Start the replay from the Mission Map.</p>
        ) : (
          events.map((e) => <EventPair key={e.event_id} e={e} />)
        )}
      </div>
    </AppShell>
  );
}

function EventPair({ e }: { e: Event }) {
  const above = e.perspective === "above";
  const detected = <EvidenceFrame event={e} />;
  const paired = <PairedFrame e={e} />;
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{eventTitle(e)}</div>
          <div className="text-sm text-muted-foreground tabular">
            {e.event_id} · {fmtUtc(e.captured_at)} · {fmtCoord(e.position.lat, e.position.lon)}
          </div>
        </div>
        <ReviewBadge tone={reviewTone(e)} />
        <span className="text-sm">Confidence <ConfidenceText value={e.model_output.confidence} /></span>
        <span className="text-sm text-muted-foreground tabular">quality {e.observation.quality_score.toFixed(2)}</span>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link to="/events/$eventId" params={{ eventId: e.event_id }}>Open event</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <CameraLabel text="Surface camera · above water" active={above} />
          {above ? detected : paired}
        </div>
        <div>
          <CameraLabel text="Underwater camera · below water" active={!above} />
          {above ? paired : detected}
        </div>
      </div>
    </section>
  );
}

function CameraLabel({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
      <span>{text}</span>
      <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", active ? "border-attention/40 bg-attention-soft text-attention-foreground" : "text-muted-foreground")}>
        {active ? "Raised the event" : "Paired view"}
      </span>
    </div>
  );
}

/** The other camera's frame at the same moment. The API carries only its observation ID so far. */
function PairedFrame({ e }: { e: Event }) {
  const pairedAbove = e.perspective !== "above";
  return (
    <figure className="overflow-hidden rounded-lg border">
      <div className={cn("relative aspect-video w-full", pairedAbove ? "bg-frame-above" : "bg-frame-below")}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center text-navy-foreground">
          <span className="text-xl font-bold tracking-wider tabular">{e.observation.paired_observation_id ?? "No paired observation"}</span>
          <span className="text-sm opacity-90">No AI detection on this camera · frame not available yet</span>
        </div>
        <div className="absolute left-2 top-2">
          <SourceChip source="placeholder" />
        </div>
      </div>
      <figcaption className="flex items-center justify-between bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="tabular">{e.observation.paired_observation_id ?? "—"}</span>
        <span>Paired with <span className="tabular">{e.observation.observation_id}</span></span>
      </figcaption>
    </figure>
  );
}
