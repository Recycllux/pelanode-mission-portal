import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/pn/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PelaNode Intelligence Portal" },
      { name: "description", content: "Portal preferences and reviewer profile." },
      { property: "og:title", content: "Settings — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Portal preferences and reviewer profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return <ComingSoon title="Settings" text="Portal preferences and reviewer profile." />;
}
