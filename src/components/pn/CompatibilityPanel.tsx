import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompatibilityChip } from "./chips";

/** Dataset compatibility states on the common 2025 scenario timeline (P0-19 §4.7). */
export function CompatibilityPanel() {
  const { data, error } = useQuery({ queryKey: ["scenario-datasets"], queryFn: () => api().getScenarioDatasets(), staleTime: Infinity });
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Dataset compatibility · common 2025 scenario timeline</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {data?.rule ?? "Scenario alignment enables integration for the hackathon; it does not convert historical records into contemporaneous measurements."}
        {data?.shared_window.from && ` Shared Danube–Iskar window: ${data.shared_window.from} to ${data.shared_window.to} (${data.shared_window.days} days).`}
      </p>
      {error && <p className="text-sm text-review">Not available: {(error as Error).message}</p>}
      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dataset</TableHead>
              <TableHead>Source years</TableHead>
              <TableHead>On the 2025 timeline</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Allowed use</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.datasets.map((d) => (
              <TableRow key={d.dataset_id}>
                <TableCell className="font-medium">
                  {d.name}
                  {d.checks["claim"] && <div className="text-xs font-normal text-muted-foreground">{d.checks["claim"]}</div>}
                </TableCell>
                <TableCell className="tabular">{d.source_years.length === 0 ? "—" : d.source_years.length > 2 ? `${d.source_years[0]}–${d.source_years.at(-1)}` : d.source_years.join(", ")}</TableCell>
                <TableCell className="tabular text-xs">{d.scenario_window ? `${d.scenario_window.scenario_from} → ${d.scenario_window.scenario_to}` : "—"}</TableCell>
                <TableCell><CompatibilityChip state={d.compatibility_state} /></TableCell>
                <TableCell className="text-sm">{d.allowed_use}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
