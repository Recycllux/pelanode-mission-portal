import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/pn/AppShell";

export const Route = createFileRoute("/nodes")({
  head: () => ({
    meta: [
      { title: "Nodes — PelaNode Intelligence Portal" },
      { name: "description", content: "Fleet overview of PelaNode devices and their health." },
      { property: "og:title", content: "Nodes — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Fleet overview of PelaNode devices and their health." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NodesPage,
});

function NodesPage() {
  return <ComingSoon title="Nodes" text="Fleet overview of PelaNode devices and their health." />;
}
