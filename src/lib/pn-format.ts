import type { Event, EventSummary, Provenance, Review } from "@/api/types";

export const fmtUtc = (iso: string | null | undefined, withSeconds = true) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const s = d.toISOString();
  return `${s.slice(11, withSeconds ? 19 : 16)} UTC`;
};

export const fmtDateUtc = (iso: string) => {
  const s = new Date(iso).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)} UTC`;
};

export const fmtDuration = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const humanize = (s: string | null | undefined) =>
  s ? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—";

export const fmtNum = (n: number, digits = 0) =>
  n.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtCoord = (lat: number, lon: number) => `${lat.toFixed(5)}°N, ${lon.toFixed(5)}°E`;

export const LOW_CONFIDENCE = 0.6;

export type ReviewTone = "required" | "unreviewed" | "confirmed" | "rejected" | "relabelled";

export function reviewTone(e: Pick<EventSummary, "attention" | "review">): ReviewTone {
  if (e.review.status === "unreviewed") return e.attention === "review_required" ? "required" : "unreviewed";
  return e.review.status;
}

export const REVIEW_LABEL: Record<ReviewTone, string> = {
  required: "Review required",
  unreviewed: "Not yet reviewed",
  confirmed: "Confirmed by reviewer",
  rejected: "Rejected by reviewer",
  relabelled: "Relabelled by reviewer",
};

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  simulated: "SIMULATED",
  replayed: "REPLAYED",
  placeholder: "PLACEHOLDER",
  organiser: "ORGANISER",
  measured: "MEASURED",
  live: "LIVE",
};

export const eventTitle = (e: { event_type: string; review: Review }) =>
  e.review.status === "relabelled" && e.review.current_label
    ? humanize(e.review.current_label)
    : `Possible ${humanize(e.event_type).toLowerCase()}`;

export const perspectiveLabel = (p: "above" | "below") => (p === "above" ? "Above water · surface camera" : "Below water · underwater camera");

/** Plain-language summary. Association wording only — never causal. */
export function systemSummary(e: Event): string {
  const cam = e.perspective === "above" ? "surface camera" : "underwater camera";
  const parts = [
    `Possible ${humanize(e.model_output.class).toLowerCase()} observed by the ${cam} at ${fmtUtc(e.captured_at, false)} (model confidence ${e.model_output.confidence.toFixed(2)}).`,
  ];
  for (const c of e.context) {
    parts.push(
      `Coincides with ${c.provenance} ${humanize(c.variable).toLowerCase()} of ${fmtNum(c.value, c.unit === "m" ? 2 : 0)} ${c.unit} at ${c.station_name} (${c.distance_km.toFixed(1)} km, ${c.time_offset_min} min). This is an association only, not a cause.`,
    );
  }
  if (e.observation.quality_flags?.length) parts.push(`Quality flags: ${e.observation.quality_flags.map(humanize).join(", ")}.`);
  parts.push(e.attention === "review_required" ? "Review required." : "No review flag raised.");
  return parts.join(" ");
}

export function sortReviewQueue<T extends Pick<EventSummary, "attention" | "review" | "confidence">>(list: T[]) {
  return [...list]
    .filter((e) => e.review.status === "unreviewed")
    .sort((a, b) => {
      const ra = a.attention === "review_required" ? 0 : 1;
      const rb = b.attention === "review_required" ? 0 : 1;
      return ra - rb || b.confidence - a.confidence;
    });
}

export function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
