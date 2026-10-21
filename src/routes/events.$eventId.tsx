import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/pn/AppShell";
import { EventDetailView } from "@/components/pn/EventDetailView";

export const Route = createFileRoute("/events/$eventId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.eventId} — Event Detail · PelaNode` },
      { name: "description", content: `Evidence, AI output, human review and associated context for event ${params.eventId}.` },
      { property: "og:title", content: `${params.eventId} — Event Detail · PelaNode` },
      { property: "og:description", content: "Five provenance layers for one PelaNode event." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventPage,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <AppShell screen="Event Detail">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline"><ChevronLeft className="h-4 w-4" /> Event Timeline</Link>
        <EventDetailView
          eventId={eventId}
          onNavigate={(id) => navigate({ to: "/events/$eventId", params: { eventId: id } })}
          onShowOnMap={(id) => navigate({ to: "/", search: { event: id } })}
        />
      </div>
    </AppShell>
  );
}
