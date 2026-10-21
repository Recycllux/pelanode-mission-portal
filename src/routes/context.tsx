import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/pn/AppShell";

export const Route = createFileRoute("/context")({
  head: () => ({
    meta: [
      { title: "Environmental Context — PelaNode Intelligence Portal" },
      { name: "description", content: "Browse the datasets associated with missions — discharge, water level and more." },
      { property: "og:title", content: "Environmental Context — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Browse the datasets associated with missions — discharge, water level and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnvironmentalContextPage,
});

function EnvironmentalContextPage() {
  return <ComingSoon title="Environmental Context" text="Browse the datasets associated with missions — discharge, water level and more." />;
}
