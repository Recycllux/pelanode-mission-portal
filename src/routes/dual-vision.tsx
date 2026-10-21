import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/pn/AppShell";

export const Route = createFileRoute("/dual-vision")({
  head: () => ({
    meta: [
      { title: "Dual Vision — PelaNode Intelligence Portal" },
      { name: "description", content: "Side-by-side surface and underwater frames for paired observations." },
      { property: "og:title", content: "Dual Vision — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Side-by-side surface and underwater frames for paired observations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DualVisionPage,
});

function DualVisionPage() {
  return <ComingSoon title="Dual Vision" text="Side-by-side surface and underwater frames for paired observations." />;
}
