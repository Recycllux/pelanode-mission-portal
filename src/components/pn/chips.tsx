import { AlertTriangle, Check, CircleDashed, Database, FlaskConical, ImageOff, PenLine, Radio, X } from "lucide-react";
import type { CompatibilityState, Provenance, QualityClass } from "@/api/types";
import { cn } from "@/lib/utils";
import { LOW_CONFIDENCE, PROVENANCE_LABEL, REVIEW_LABEL, type ReviewTone } from "@/lib/pn-format";

export function SourceChip({ source, className, label }: { source: Provenance; className?: string; label?: string }) {
  const sim = source === "simulated" || source === "placeholder";
  const Icon = source === "placeholder" ? ImageOff : sim ? FlaskConical : source === "replayed" ? Radio : Database;
  return (
    <span
      title={`Source: ${PROVENANCE_LABEL[source]}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        sim ? "border-sim-foreground/30 bg-sim/60 text-sim-foreground" : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label ?? PROVENANCE_LABEL[source]}
    </span>
  );
}

export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "sim-stripes inline-flex items-center gap-1.5 rounded-md border border-sim-foreground/40 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em]",
        className,
      )}
      role="status"
      aria-label="All data in this demo is simulated or replayed"
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden />
      Simulated
    </span>
  );
}

const TONE_STYLE: Record<ReviewTone, string> = {
  required: "bg-review-soft text-review border-review/30",
  unreviewed: "bg-navy-soft text-navy border-navy/20",
  confirmed: "bg-teal-soft text-teal border-teal/30",
  dismissed: "bg-muted text-lowconf border-border",
  relabelled: "bg-relabel-soft text-relabel border-relabel/30",
};
const TONE_ICON = { required: AlertTriangle, unreviewed: CircleDashed, confirmed: Check, dismissed: X, relabelled: PenLine };

export function ReviewBadge({ tone, className }: { tone: ReviewTone; className?: string }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", TONE_STYLE[tone], className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {REVIEW_LABEL[tone]}
    </span>
  );
}

/** Map-consistent glyph: circle = above water, triangle = below; hollow when low confidence. */
export function EventGlyph({ perspective, tone, confidence, size = 18, selected }: { perspective: "above" | "below"; tone: ReviewTone; confidence: number; size?: number; selected?: boolean }) {
  const low = confidence < LOW_CONFIDENCE;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("pn-marker shrink-0", `pn-marker--${tone}`, low && "pn-marker--hollow", selected && "pn-marker--selected")}
    >
      {perspective === "above" ? <circle className="pn-fill" cx="12" cy="12" r="9" /> : <path className="pn-fill" d="M12 3 L21.5 20 H2.5 Z" />}
    </svg>
  );
}

export function ConfidenceText({ value }: { value: number }) {
  const low = value < LOW_CONFIDENCE;
  return (
    <span className={cn("tabular font-semibold", low && "text-lowconf")}>
      {value.toFixed(2)}
      {low && <span className="ml-1 text-xs font-medium">(low confidence)</span>}
    </span>
  );
}

/** Common 2025 scenario timeline badge (P0-19 §4.7): harmonised records are historical, never 2025 measurements. */
export function ScenarioBadge({ label = "SCENARIO 2025 / SOURCE HISTORICAL", className }: { label?: string; className?: string }) {
  return (
    <span
      title="Shown on the common 2025 scenario timeline for this hackathon demonstration. A harmonised record is a historical observation, not a 2025 measurement."
      className={cn("inline-flex shrink-0 items-center gap-1 rounded border border-navy/30 bg-navy-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy", className)}
    >
      {label}
    </span>
  );
}

const CLASS_STYLE: Record<QualityClass, string> = {
  A: "border-teal/40 bg-teal-soft text-teal",
  B: "border-attention/40 bg-attention-soft text-attention-foreground",
  C: "border-review/40 bg-review-soft text-review",
};

/** Pair reliability class (demo tuning): A operational, B with caution, C not operational. */
export function QualityChip({ cls, className }: { cls: QualityClass; className?: string }) {
  return (
    <span title={cls === "A" ? "Operational" : cls === "B" ? "Operational with caution" : "Not operational"} className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[11px] font-bold", CLASS_STYLE[cls], className)}>
      {cls}
    </span>
  );
}

const STATE_STYLE: Record<CompatibilityState, string> = {
  DEMONSTRATED: "border-teal/40 bg-teal-soft text-teal",
  "SCENARIO-ALIGNED": "border-attention/40 bg-attention-soft text-attention-foreground",
  "CONTEXT ONLY": "border-border bg-muted text-muted-foreground",
  "OPTIONAL CONTEXT": "border-border bg-muted text-muted-foreground",
  FUTURE: "border-sim-foreground/30 bg-sim/60 text-sim-foreground",
};

export function CompatibilityChip({ state, className }: { state: CompatibilityState; className?: string }) {
  return <span className={cn("inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATE_STYLE[state], className)}>{state}</span>;
}
