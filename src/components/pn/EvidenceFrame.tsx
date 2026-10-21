import { useState } from "react";
import { api } from "@/api";
import type { Event } from "@/api/types";
import { cn } from "@/lib/utils";
import { SourceChip } from "./chips";

const W = 1280;
const H = 720;

/** Evidence frame with bbox overlay. Falls back to a labelled placeholder. */
export function EvidenceFrame({ event, className }: { event: Event; className?: string }) {
  const uri = event.observation.evidence.frame_uri;
  const url = api().mediaUrl(uri);
  const [failed, setFailed] = useState(false);
  const above = event.perspective === "above";
  const frameId = uri?.split("/").pop()?.replace(/\.\w+$/, "") ?? "unknown frame";
  const showImg = url && !failed;
  const bbox = event.model_output.bbox;

  return (
    <figure className={cn("overflow-hidden rounded-lg border", className)}>
      <div className={cn("relative aspect-video w-full", above ? "bg-frame-above" : "bg-frame-below")}>
        {showImg ? (
          <img src={url} alt={`Evidence frame ${frameId}`} className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-navy-foreground">
            <span className="text-2xl font-bold tracking-wider tabular">{frameId}</span>
            <span className="text-sm opacity-90">{failed || (uri && event.observation.evidence.provenance !== "placeholder") ? "Frame not available" : "Placeholder frame — no real image yet"}</span>
          </div>
        )}
        {bbox && (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <rect x={bbox[0]} y={bbox[1]} width={bbox[2]} height={bbox[3]} className="fill-none stroke-attention" strokeWidth={5} />
            <rect x={bbox[0]} y={bbox[1] - 34} width={Math.max(bbox[2], 260)} height={32} className="fill-attention" />
            <text x={bbox[0] + 8} y={bbox[1] - 11} className="fill-navy-foreground" fontSize={22} fontWeight={700}>
              AI: {event.model_output.class} {event.model_output.confidence.toFixed(2)}
            </text>
          </svg>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <SourceChip source={event.observation.evidence.provenance} />
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-navy/80 px-2 py-0.5 text-xs font-medium text-navy-foreground">
          {above ? "Surface camera · above water" : "Underwater camera · below water"}
        </span>
      </div>
      <figcaption className="flex items-center justify-between bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="tabular">{event.observation.observation_id}</span>
        {event.observation.paired_observation_id && <span>Paired: <span className="tabular">{event.observation.paired_observation_id}</span></span>}
      </figcaption>
    </figure>
  );
}
