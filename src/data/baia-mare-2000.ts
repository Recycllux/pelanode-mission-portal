// Baia Mare cyanide spill, 30 Jan 2000: documented history plus one illustrative PelaNode scenario.
// Runs entirely in the browser (no backend data covers the Someș or the Tisza).
// Times are local (CET/EET as reported) and expressed as hours after the dam failure.
// Plume path: Natural Earth 1:10m river lines (Someș, Tisza, Danube) from src/data/danube-basemap.json, schematic.
import PATH from "./baia-mare-path.json";

export const PLUME_PATH = PATH as [number, number][];

/** 30 Jan 2000, 22:00: failure of the Aurul tailings dam. */
export const SPILL_LABEL = "30 Jan 2000, 22:00";
const T0 = Date.UTC(2000, 0, 30, 22, 0);
export const SCENARIO_HOURS = 14 * 24;

/** Hungarian limit for drinking water and heavily polluted surface water (mg/l CN). EU 98/83/EC: 0.05 mg/l. */
export const LIMIT_MG_L = 0.1;

export const SOURCES = [
  {
    id: "hu",
    label: "Hungarian Ministry for Environment, preliminary evaluation of the cyanide pollution of the Szamos and Tisza, Feb 2000",
    url: "https://reliefweb.int/report/hungary/preliminary-evaluation-cyanide-pollution-rivers-szamos-and-tisza",
  },
  {
    id: "unep",
    label: "UNEP/OCHA assessment mission, Cyanide spill at Baia Mare, Romania",
    url: "https://reliefweb.int/report/romania/cyanide-spill-baia-mare-romania-unepocha-assessment-mission-advance-copy",
  },
  {
    id: "icpdr",
    label: "ICPDR Danube Watch 1/2002, the Tisza after the spill",
    url: "https://archive.iwlearn.net/icpdr.org/icpdr/static/dw2002_1/dw0102p06.htm",
  },
] as const;
export type SourceId = (typeof SOURCES)[number]["id"];

export interface PlumePoint {
  id: string;
  name: string;
  river: string;
  country: "RO" | "HU" | "RS";
  lat: number;
  lon: number;
  /** Hours after the dam failure when the plume peak passed; null when the sources give no time. */
  arrival_h: number | null;
  arrival_label: string;
  peak_mg_l: number | null;
  note?: string;
  source: SourceId;
}

const h = (month: 0 | 1, day: number, hour: number, minute = 0) => (Date.UTC(2000, month, day, hour, minute) - T0) / 3_600_000;

export const POINTS: PlumePoint[] = [
  { id: "aurul", name: "Baia Mare · Aurul tailings pond", river: "Lăpuș", country: "RO", lat: 47.657, lon: 23.568, arrival_h: 0, arrival_label: "30 Jan, 22:00", peak_mg_l: null, note: "Dam breach, ~100,000 m³ of cyanide-bearing water released", source: "unep" },
  { id: "csenger", name: "Csenger · border", river: "Szamos (Someș) km 45.4", country: "HU", lat: 47.835, lon: 22.68, arrival_h: h(1, 1, 16), arrival_label: "1 Feb, ~16:00", peak_mg_l: 32.6, source: "hu" },
  { id: "balsa", name: "Balsa", river: "Tisza km 558", country: "HU", lat: 48.175, lon: 21.535, arrival_h: h(1, 3, 4), arrival_label: "3 Feb, 04:00", peak_mg_l: 12.4, note: "The source's summary table dates this peak 5 Feb, 08:00", source: "hu" },
  { id: "tiszafured", name: "Tiszafüred", river: "Tisza km 433.5", country: "HU", lat: 47.617, lon: 20.762, arrival_h: h(1, 7, 16), arrival_label: "7 Feb, 16:00", peak_mg_l: 4.9, source: "hu" },
  { id: "kiskore", name: "Kisköre", river: "Tisza km 401.6", country: "HU", lat: 47.497, lon: 20.497, arrival_h: h(1, 8, 6), arrival_label: "8 Feb, 06:00", peak_mg_l: 3.88, source: "hu" },
  { id: "szolnok", name: "Szolnok", river: "Tisza km 340", country: "HU", lat: 47.176, lon: 20.196, arrival_h: h(1, 8, 18), arrival_label: "8 Feb, 18:00", peak_mg_l: 2.85, note: "Tisza abstraction suspended for 11 h on 9 Feb; artesian wells and bottled water. The summary table dates this peak 9 Feb, 04:00", source: "hu" },
  { id: "csongrad", name: "Csongrád", river: "Tisza km 246", country: "HU", lat: 46.711, lon: 20.143, arrival_h: h(1, 10, 12), arrival_label: "10 Feb, 12:00", peak_mg_l: 2.9, source: "hu" },
  { id: "szeged", name: "Szeged", river: "Tisza km 177.5", country: "HU", lat: 46.253, lon: 20.148, arrival_h: h(1, 11, 12), arrival_label: "11 Feb, 12:00", peak_mg_l: 2.2, source: "hu" },
  { id: "tiszasziget", name: "Tiszasziget · exit from Hungary", river: "Tisza km 162.5", country: "HU", lat: 46.165, lon: 20.16, arrival_h: h(1, 12, 4), arrival_label: "12 Feb, early morning", peak_mg_l: 1.49, source: "hu" },
  { id: "titel", name: "Tisza–Danube confluence (Titel)", river: "Tisza → Danube", country: "RS", lat: 45.205, lon: 20.295, arrival_h: null, arrival_label: "after 12 Feb, not dated in our sources", peak_mg_l: null, source: "icpdr" },
];

export type Lane = "history" | "pelanode";

export interface CaseEvent {
  at_h: number;
  lane: Lane;
  title: string;
  detail?: string;
  tone: "neutral" | "warning" | "critical" | "success";
  source?: SourceId;
}

/** When the formal alarm reached Hungary in 2000 (31 Jan, 20:55). */
export const HISTORY_ALERT_H = h(0, 31, 20, 55);

/**
 * Illustrative scenario, not a reconstruction: a PelaNode node drifting a few kilometres below the pond.
 * Its cameras and edge AI flag a surface anomaly, an operator confirms it and one alert goes to every
 * authority downstream at once. Both delays are assumptions.
 */
export const PELANODE_DETECT_H = 2;
export const PELANODE_ALERT_H = 2.5;
export const PELANODE_NODE = { lat: 47.668, lon: 23.52 };

export const EVENTS: CaseEvent[] = [
  { at_h: 0, lane: "history", tone: "critical", title: "Tailings dam fails at Baia Mare", detail: "Snowmelt and rain overflow the Aurul pond; a ~25 m breach releases ~100,000 m³ of cyanide-bearing water into the Lăpuș and Someș.", source: "unep" },
  { at_h: h(0, 31, 18, 20), lane: "history", tone: "warning", title: "First written notice to the Upper-Tisza inspectorate", detail: "Lăpuș stream measured at 19.16 mg/l cyanide.", source: "hu" },
  { at_h: HISTORY_ALERT_H, lane: "history", tone: "warning", title: "Formal alarm from Bucharest to Hungary", detail: "About 23 h after the breach.", source: "hu" },
  { at_h: h(1, 1, 16), lane: "history", tone: "critical", title: "Plume enters Hungary at Csenger", detail: "Peak 32.6 mg/l, over 300 × the 0.1 mg/l limit.", source: "hu" },
  { at_h: h(1, 2, 0), lane: "history", tone: "critical", title: "First report of dead fish (Satu Mare)", detail: "Date only in the source.", source: "unep" },
  { at_h: h(1, 3, 4), lane: "history", tone: "critical", title: "Plume reaches the Tisza", detail: "Near-total plankton death in the Szamos and upper Tisza.", source: "hu" },
  { at_h: h(1, 8, 18), lane: "history", tone: "warning", title: "Plume at Szolnok", detail: "Abstraction from the Tisza suspended for 11 h; the city switches to artesian wells and bottled water.", source: "hu" },
  { at_h: h(1, 12, 4), lane: "history", tone: "warning", title: "Plume leaves Hungary towards Serbia and the Danube", detail: "Hungary estimated 100–120 t of dissolved cyanide in the wave.", source: "hu" },

  { at_h: 0, lane: "pelanode", tone: "critical", title: "Tailings dam fails at Baia Mare", detail: "Same breach, same water: the release itself is not prevented." },
  { at_h: PELANODE_DETECT_H, lane: "pelanode", tone: "warning", title: "PelaNode flags an anomaly below the pond", detail: "Camera evidence with position and time, uploaded over 4G as a review-required event." },
  { at_h: PELANODE_ALERT_H, lane: "pelanode", tone: "warning", title: "Confirmed event shared with RO, HU and RS at once", detail: "Every place downstream gets the same evidence and its expected arrival window." },
  { at_h: h(1, 1, 16), lane: "pelanode", tone: "success", title: "Csenger: plume arrives as announced", detail: "Border authorities had about 1.6 days to prepare instead of 19 h." },
  { at_h: h(1, 8, 18), lane: "pelanode", tone: "success", title: "Szolnok: intake plan ready days ahead", detail: "Same 11 h abstraction stop, planned from day 0 instead of from day 1." },
  { at_h: h(1, 12, 4), lane: "pelanode", tone: "success", title: "Serbia and the Danube warned since day 0", detail: "Downstream countries share the same event from the start." },
];

/** Hours of preparation at a place: arrival minus the moment the warning was issued. */
export function leadHours(p: PlumePoint, lane: Lane): number | null {
  if (p.arrival_h == null || p.arrival_h === 0) return null;
  const lead = p.arrival_h - (lane === "history" ? HISTORY_ALERT_H : PELANODE_ALERT_H);
  return Math.round(lead * 10) / 10;
}

export function clockLabel(hours: number): string {
  const d = new Date(T0 + hours * 3_600_000);
  const day = d.getUTCDate();
  const mon = d.getUTCMonth() === 0 ? "Jan" : "Feb";
  return `${day} ${mon}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function km(a: [number, number], b: [number, number]) {
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]);
  const dLon = toR(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

const CUM = PLUME_PATH.reduce<number[]>((acc, p, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + km(PLUME_PATH[i - 1]!, p)], []);

function nearestIndex(lat: number, lon: number) {
  let best = 0;
  PLUME_PATH.forEach((p, i) => {
    if (km(p, [lat, lon]) < km(PLUME_PATH[best]!, [lat, lon])) best = i;
  });
  return best;
}

/** Distance along the path (km) at each dated point, for interpolating the plume between documented times. */
const ANCHORS = POINTS.filter((p) => p.arrival_h != null).map((p) => ({ h: p.arrival_h!, km: CUM[nearestIndex(p.lat, p.lon)]! }));

/** The plume front: the part of the path passed by `hours` after the breach. Undated beyond the last documented point. */
export function plumeFront(hours: number): { path: [number, number][]; dated: boolean } {
  const last = ANCHORS[ANCHORS.length - 1]!;
  let front: number;
  if (hours >= last.h) {
    front = last.km;
  } else {
    const i = ANCHORS.findIndex((a) => a.h > hours);
    const a = ANCHORS[i - 1]!;
    const b = ANCHORS[i]!;
    front = a.km + ((hours - a.h) / (b.h - a.h)) * (b.km - a.km);
  }
  const path: [number, number][] = [];
  for (let i = 0; i < PLUME_PATH.length && CUM[i]! <= front; i++) path.push(PLUME_PATH[i]!);
  return { path, dated: hours <= last.h };
}
