import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type ExportFormat } from "@/api";
import { AppShell } from "@/components/pn/AppShell";
import { ConfidenceText, EventGlyph, ReviewBadge, SourceChip } from "@/components/pn/chips";
import { MISSION_ID, useEvents, useReport } from "@/hooks/use-mission";
import { eventTitle, fmtUtc, reviewTone } from "@/lib/pn-format";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Reports — PelaNode Intelligence Portal" },
      { name: "description", content: "Summary of mission HACK-001 with exports to HTML, CSV and GeoJSON. Demo data is simulated." },
      { property: "og:title", content: "Reports — PelaNode Intelligence Portal" },
      { property: "og:description", content: "Mission summary and exports for PelaNode operators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: r } = useReport();
  const { data: events = [] } = useEvents();
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const doExport = async (format: ExportFormat) => {
    setBusy(format);
    setErr(null);
    try {
      const { file_uri } = await api().exportReport(MISSION_ID, format);
      const url = api().fileUrl(file_uri);
      if (format === "html") window.open(url, "_blank", "noopener");
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${MISSION_ID}-report.${format === "geojson" ? "geojson" : format}`;
        a.click();
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const cards = [
    { k: "Observations", v: r?.observations },
    { k: "Events", v: r?.events },
    { k: "Review required", v: r?.review_required, warn: true },
    { k: "Reviewed", v: r?.reviewed },
    { k: "Path length", v: r ? `${r.path_length_km.toFixed(2)} km` : undefined },
  ];

  return (
    <AppShell screen="Reports">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Mission report · {r?.mission_id}</h1>
            <p className="text-sm text-muted-foreground">Data up to mission time {fmtUtc(r?.until)} · <SourceChip source={r?.data_origin ?? "simulated"} /></p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="lg" onClick={() => doExport("html")} disabled={!!busy}><FileText aria-hidden /> Generate report (HTML)</Button>
            <Button size="lg" variant="outline" onClick={() => doExport("csv")} disabled={!!busy}><Download aria-hidden /> Download CSV</Button>
            <Button size="lg" variant="outline" onClick={() => doExport("geojson")} disabled={!!busy}><Download aria-hidden /> Download GeoJSON</Button>
          </div>
        </div>
        {err && <p className="text-sm text-review">Export failed: {err}</p>}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {cards.map((c) => (
            <div key={c.k} className={`rounded-lg border bg-card p-5 ${c.warn && c.v ? "border-review/40 bg-review-soft" : ""}`}>
              <div className={`text-3xl font-bold tabular ${c.warn && c.v ? "text-review" : ""}`}>{c.v ?? "—"}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.k}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Time (UTC)</TableHead>
                <TableHead>Perspective</TableHead>
                <TableHead>AI class</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Origin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No events yet at this mission time.</TableCell></TableRow>
              )}
              {events.map((e) => (
                <TableRow key={e.event_id}>
                  <TableCell>
                    <Link to="/events/$eventId" params={{ eventId: e.event_id }} className="flex items-center gap-2 font-semibold text-teal hover:underline">
                      <EventGlyph perspective={e.perspective} tone={reviewTone(e)} confidence={e.confidence} /> {e.event_id}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular">{fmtUtc(e.captured_at)}</TableCell>
                  <TableCell>{e.perspective === "above" ? "Above water" : "Below water"}</TableCell>
                  <TableCell>{eventTitle(e)}</TableCell>
                  <TableCell><ConfidenceText value={e.confidence} /></TableCell>
                  <TableCell><ReviewBadge tone={reviewTone(e)} /></TableCell>
                  <TableCell><SourceChip source={e.data_origin} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
