import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/pn/AppShell";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PelaNode Intelligence Portal" },
      { name: "description", content: "Trends across missions and review outcomes." },
      { property: "og:title", content: "Analytics — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Trends across missions and review outcomes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return <ComingSoon title="Analytics" text="Trends across missions and review outcomes." />;
}
