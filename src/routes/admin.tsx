import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, PN_KEY_STORAGE } from "@/api";
import { AppShell } from "@/components/pn/AppShell";
import { SPEEDS } from "@/components/pn/TimeBar";
import { useReplay, useReplayControl, useResetDemo } from "@/hooks/use-mission";

export const CONTEXT_SOURCE_STORAGE = "pn_context_source";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — PelaNode" },
      { name: "description", content: "Demo administration for the PelaNode portal." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — PelaNode" },
      { property: "og:description", content: "Demo administration for the PelaNode portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ctxSource, setCtxSource] = useState("simulated");
  const reset = useResetDemo();
  const { data: replay } = useReplay();
  const ctl = useReplayControl();

  useEffect(() => {
    setHasKey(!!localStorage.getItem(PN_KEY_STORAGE));
    setCtxSource(localStorage.getItem(CONTEXT_SOURCE_STORAGE) ?? "simulated");
  }, []);

  return (
    <AppShell screen="Admin (hidden)">
      <div className="mx-auto max-w-xl space-y-6 px-6 py-10">
        <h1 className="text-2xl font-bold">Demo admin</h1>
        <p className="text-sm text-muted-foreground">API mode: <strong>{api().kind === "mock" ? "MockApi (in-browser simulation)" : "HttpApi"}</strong></p>

        <section className="space-y-2 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">X-PN-Key</h2>
          <p className="text-sm text-muted-foreground">Sent with every POST. Stored in this browser only. Current: {hasKey ? "a key is stored" : "no key stored"}.</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem(PN_KEY_STORAGE, key);
              setHasKey(!!key);
              setKey("");
              setSaved(true);
            }}
          >
            <Input type="password" autoComplete="off" value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); }} placeholder="Enter new key" className="h-11" />
            <Button size="lg" type="submit">Save</Button>
          </form>
          {saved && <p className="text-sm text-teal">Key saved.</p>}
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Replay</h2>
          <div className="flex flex-wrap gap-2">
            <Select value={String(replay?.speed ?? 100)} onValueChange={(v) => ctl.mutate({ action: "speed", speed: Number(v) })}>
              <SelectTrigger className="h-11 w-44" aria-label="Replay speed"><SelectValue /></SelectTrigger>
              <SelectContent>{SPEEDS.map((s) => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="lg" variant="destructive" onClick={() => reset.mutate()} disabled={reset.isPending}>Reset demo</Button>
          </div>
          {reset.isSuccess && <p className="text-sm text-teal">Demo reset: replay idle, reviews cleared.</p>}
        </section>

        <section className="space-y-2 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Context source</h2>
          <p className="text-sm text-muted-foreground">Display-only in the mock.</p>
          <Select value={ctxSource} onValueChange={(v) => { setCtxSource(v); localStorage.setItem(CONTEXT_SOURCE_STORAGE, v); }}>
            <SelectTrigger className="h-11 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="simulated">Simulated</SelectItem>
              <SelectItem value="organiser">Organiser</SelectItem>
            </SelectContent>
          </Select>
        </section>
      </div>
    </AppShell>
  );
}
