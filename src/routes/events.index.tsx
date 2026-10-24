import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/pn/AppShell";
import { ConfidenceText, EventGlyph, ReviewBadge, SourceChip } from "@/components/pn/chips";
import { ContextChart } from "@/components/pn/ContextChart";
import { useEvents, useMission, useMissionContext, useMissionTime } from "@/hooks/use-mission";
import { eventTitle, fmtUtc, humanize, reviewTone } from "@/lib/pn-format";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Event Timeline — PelaNode Intelligence Portal" },
      { name: "description", content: "AI-generated events of mission HACK-001 in time order, with filters and simulated water context." },
      { property: "og:title", content: "Event Timeline — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Review AI-generated PelaNode events in time order alongside simulated context." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted-foreground sm:w-auto">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full text-sm text-foreground sm:w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function EventsPage() {
  const navigate = useNavigate();
  const { data: events = [] } = useEvents();
  const { data: ctx } = useMissionContext();
  const { data: mission } = useMission();
  const until = useMissionTime();
  const [status, setStatus] = useState("all");
  const [persp, setPersp] = useState("all");
  const [cls, setCls] = useState("all");

  const classes = [...new Set(events.map((e) => e.event_type))];
  const filtered = events.filter(
    (e) => (status === "all" || reviewTone(e) === status) && (persp === "all" || e.perspective === persp) && (cls === "all" || e.event_type === cls),
  );
  const open = (id: string) => navigate({ to: "/events/$eventId", params: { eventId: id } });

  return (
    <AppShell screen="Event Timeline">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-4 sm:px-6 sm:py-6">
        <ContextChart context={ctx} events={events} until={until} missionStart={mission?.planned_start} missionEnd={mission?.planned_end} onSelectEvent={open} />
        <div className="flex flex-wrap items-end gap-4">
          <Filter label="Review status" value={status} onChange={setStatus} options={[{ v: "all", l: "All statuses" }, { v: "required", l: "Review required" }, { v: "unreviewed", l: "Not yet reviewed" }, { v: "confirmed", l: "Confirmed" }, { v: "dismissed", l: "Dismissed" }, { v: "relabelled", l: "Relabelled" }]} />
          <Filter label="Perspective" value={persp} onChange={setPersp} options={[{ v: "all", l: "Above and below" }, { v: "above", l: "Above water" }, { v: "below", l: "Below water" }]} />
          <Filter label="Class" value={cls} onChange={setCls} options={[{ v: "all", l: "All classes" }, ...classes.map((c) => ({ v: c, l: humanize(c) }))]} />
          <span className="ml-auto text-sm text-muted-foreground tabular">{filtered.length} of {events.length} events up to {fmtUtc(until)}</span>
        </div>
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No events yet at this mission time. Start the replay from the Mission Map.</p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-teal/40 pl-3 sm:pl-6">
            {filtered.map((e) => (
              <li key={e.event_id}>
                <button type="button" onClick={() => open(e.event_id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-3 text-left transition hover:border-teal hover:bg-teal-soft sm:p-4 lg:flex-nowrap">
                  <span className="w-16 shrink-0 text-lg font-bold tabular sm:w-24">{fmtUtc(e.captured_at, false).replace(" UTC", "")}<span className="block text-xs font-normal text-muted-foreground">UTC</span></span>
                  <EventGlyph perspective={e.perspective} tone={reviewTone(e)} confidence={e.confidence} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{eventTitle(e)}</div>
                    <div className="text-sm text-muted-foreground tabular">{e.event_id} · {e.perspective === "above" ? "Above water (surface camera)" : "Below water (underwater camera)"} · quality {e.quality_score.toFixed(2)}</div>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 lg:w-auto lg:flex-nowrap">
                    <ReviewBadge tone={reviewTone(e)} />
                    <span className="lg:w-40 lg:text-right">Confidence <ConfidenceText value={e.confidence} /></span>
                    <SourceChip source={e.data_origin} />
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
