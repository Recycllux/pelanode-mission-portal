import { Link } from "@tanstack/react-router";
import { BatteryMedium, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMission, useNodeStatus } from "@/hooks/use-mission";
import { SimulatedBadge } from "./chips";

const NAV = [
  { to: "/", label: "Mission Map" },
  { to: "/river", label: "River Intelligence" },
  { to: "/danube", label: "Danube Forecast" },
  { to: "/events", label: "Events" },
  { to: "/context", label: "Datasets" },
  { to: "/dual-vision", label: "Dual Vision" },
  { to: "/analytics", label: "Analytics" },
  { to: "/nodes", label: "Nodes" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
] as const;

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="15" className="fill-teal" />
        <path d="M5 19c3.5-3 7.5-3 11 0s7.5 3 11 0" className="fill-none stroke-navy-foreground" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="16" cy="12" r="3.6" className="fill-attention" />
      </svg>
      <span className="text-lg leading-none">
        PelaNode<span className="ml-1 hidden font-medium opacity-80 sm:inline">Intelligence Portal</span>
      </span>
    </span>
  );
}

function NodeChip() {
  const { data: m } = useMission();
  const { data: s } = useNodeStatus();
  const online = s?.connectivity === "online";
  return (
    <span className="hidden items-center gap-2 rounded-md border border-navy-foreground/20 bg-navy-foreground/10 px-3 py-1.5 text-sm lg:flex">
      {online ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
      <span className="font-semibold">{m?.node.node_id ?? "—"}</span>
      <span className="opacity-80">{s ? (online ? "Online" : s.connectivity) : "…"}</span>
      <BatteryMedium className="h-4 w-4" aria-hidden />
      <span className="tabular">{s ? `${s.battery_pct}%` : "—"}</span>
    </span>
  );
}

export function AppShell({ screen, children, fill }: { screen: string; children: ReactNode; fill?: boolean }) {
  const { data: m } = useMission();
  const navRef = useRef<HTMLElement>(null);
  // On narrow screens the tab row scrolls horizontally; keep the active tab visible.
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[data-status="active"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [screen]);
  return (
    <div className={cn("flex flex-col", fill ? "min-h-screen lg:h-screen lg:overflow-hidden" : "min-h-screen")}>
      <header className="no-print relative z-40 bg-navy text-navy-foreground shadow-md">
        <div className="flex items-center gap-3 px-4 py-2.5 sm:gap-6 sm:px-6 sm:py-3">
          <Link to="/" aria-label="PelaNode home" className="shrink-0">
            <Wordmark />
          </Link>
          <div className="hidden min-w-0 border-l border-navy-foreground/25 pl-6 md:block">
            <div className="text-xs uppercase tracking-wider opacity-75">{screen}</div>
            <div className="truncate text-sm font-semibold">
              {m ? `${m.mission_id} · ${m.name}` : "Loading mission…"}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <NodeChip />
            <SimulatedBadge className="px-2 tracking-[0.08em] sm:px-3 sm:tracking-[0.18em]" />
          </div>
        </div>
        <nav ref={navRef} className="flex gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:px-4" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="whitespace-nowrap rounded-t-md px-3 py-2.5 sm:px-4 text-sm font-medium opacity-80 transition hover:bg-navy-foreground/10 hover:opacity-100"
              activeProps={{ className: "!opacity-100 bg-background text-navy" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className={cn("flex-1", fill && "lg:min-h-0")}>{children}</main>
    </div>
  );
}

export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <AppShell screen={title}>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{text}</p>
        <p className="mt-8 inline-block rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground">Coming soon — not part of the hackathon build.</p>
      </div>
    </AppShell>
  );
}
