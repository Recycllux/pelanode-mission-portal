// Browser-only: imports Leaflet. Load via React.lazy behind <ClientOnly>.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { haversineKm } from "@/api/mock-data";
import type { ContextDataset, ContextRecord, DanubeProfilePoint, EventSummary, TrackPoint } from "@/api/types";
import { LOW_CONFIDENCE, fmtNum, fmtUtc, humanize, reviewTone } from "@/lib/pn-format";

export interface MapLayers {
  track: boolean;
  events: boolean;
  discharge: boolean;
  level: boolean;
  gauges: boolean;
}

export interface MissionMapProps {
  track: TrackPoint[];
  events: EventSummary[];
  datasets?: ContextDataset[] | undefined;
  /** Real Danube gauges (organiser data, 2021) with the level on the replay date. */
  gauges?: DanubeProfilePoint[] | undefined;
  gaugeDate?: string | undefined;
  latest?: Record<string, ContextRecord | undefined> | undefined;
  layers?: MapLayers | undefined;
  selectedId?: string | undefined;
  focus?: { lat: number; lon: number; key: string } | null | undefined;
  onSelectEvent?: (id: string) => void | undefined;
  interactive?: boolean | undefined;
  fitAll?: boolean | undefined;
  /** Mission area [min_lon,min_lat,max_lon,max_lat]; the map fits it plus context stations once on open. */
  initialBbox?: [number, number, number, number] | undefined;
}

const TEAL_TRACK = "var(--teal)";

function eventIcon(e: EventSummary, selected: boolean) {
  const tone = reviewTone(e);
  const low = e.confidence < LOW_CONFIDENCE;
  const shape = e.perspective === "above" ? `<circle class="pn-fill" cx="12" cy="12" r="9"/>` : `<path class="pn-fill" d="M12 3 L21.5 20 H2.5 Z"/>`;
  const cls = `pn-marker pn-marker--${tone}${low ? " pn-marker--hollow" : ""}${selected ? " pn-marker--selected" : ""}`;
  return L.divIcon({
    className: "pn-divicon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<svg class="${cls}" width="30" height="30" viewBox="0 0 24 24">${shape}${tone === "required" ? `<text x="12" y="${e.perspective === "above" ? 16 : 18}" text-anchor="middle" font-size="11" font-weight="800" fill="white">!</text>` : ""}</svg>`,
  });
}

function nodeIcon(heading: number) {
  return L.divIcon({
    className: "pn-divicon",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    html: `<svg class="pn-node" width="48" height="48" viewBox="0 0 48 48"><circle class="pn-node-pulse" cx="24" cy="24" r="20"/><g transform="rotate(${heading} 24 24)"><path class="pn-node-body" d="M24 6 L34 34 L24 28 L14 34 Z"/></g></svg>`,
  });
}

const stationIcon = L.divIcon({
  className: "pn-divicon",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<svg width="22" height="22" viewBox="0 0 22 22"><rect class="pn-station" x="3" y="3" width="16" height="16" rx="3"/></svg>`,
});

const gaugeIcon = L.divIcon({
  className: "pn-divicon",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `<svg width="24" height="24" viewBox="0 0 24 24"><path class="pn-gauge" d="M12 2 L22 12 L12 22 L2 12 Z"/><rect class="pn-gauge-bar" x="9" y="7" width="6" height="10" rx="1"/></svg>`,
});

/** Gauges this close to the mission get a permanent label and are included in the opening view. */
const NEAR_GAUGE_KM = 10;

function Controller({ focus, track, fitAll, initialBbox, datasets, nearGauges }: { focus?: MissionMapProps["focus"]; track: TrackPoint[]; fitAll?: boolean | undefined; initialBbox?: MissionMapProps["initialBbox"]; datasets: ContextDataset[]; nearGauges: DanubeProfilePoint[] | null }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !initialBbox || datasets.length === 0 || !nearGauges) return;
    fitted.current = true;
    const [minLon, minLat, maxLon, maxLat] = initialBbox;
    const b = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);
    for (const d of datasets) b.extend([d.lat, d.lon]);
    for (const g of nearGauges) b.extend([g.lat!, g.lon!]);
    map.fitBounds(b, { padding: [40, 40] });
  }, [initialBbox, datasets, nearGauges]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (fitAll && track.length > 1) map.fitBounds(L.latLngBounds(track.map((p) => [p.lat, p.lon])), { padding: [40, 40] });
  }, [fitAll, track.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MissionMap({ track, events, datasets = [], gauges, gaugeDate, latest = {}, layers = { track: true, events: true, discharge: false, level: false, gauges: true }, selectedId, focus, onSelectEvent, interactive = true, fitAll, initialBbox }: MissionMapProps) {
  const positions = useMemo(() => track.map((p) => [p.lat, p.lon] as [number, number]), [track]);
  const head = track.at(-1);
  const placed = useMemo(() => (gauges ?? []).filter((g) => g.lat != null && g.lon != null), [gauges]);
  const isNear = (g: DanubeProfilePoint) => {
    if (!initialBbox) return false;
    const [minLon, minLat, maxLon, maxLat] = initialBbox;
    return haversineKm((minLat + maxLat) / 2, (minLon + maxLon) / 2, g.lat!, g.lon!) <= NEAR_GAUGE_KM;
  };
  const nearGauges = useMemo(() => (!layers.gauges ? [] : gauges ? placed.filter(isNear) : null), [layers.gauges, gauges, placed, initialBbox]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapContainer
      center={[43.8998, 25.9306]}
      zoom={15}
      className="pn-muted-tiles h-full w-full"
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      attributionControl
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" maxZoom={19} />
      <Controller focus={focus} track={track} fitAll={fitAll} initialBbox={initialBbox} datasets={datasets} nearGauges={nearGauges} />
      {layers.track && positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: TEAL_TRACK, weight: 5, opacity: 0.9 }} />}
      {layers.events &&
        events.map((e) => (
          <Marker key={e.event_id} position={[e.position.lat, e.position.lon]} icon={eventIcon(e, e.event_id === selectedId)} eventHandlers={{ click: () => onSelectEvent?.(e.event_id) }} zIndexOffset={e.event_id === selectedId ? 1000 : 0}>
            <Tooltip direction="top" offset={[0, -14]}>
              <strong>{e.event_id}</strong> · possible {humanize(e.event_type).toLowerCase()} · {e.confidence.toFixed(2)} · {fmtUtc(e.captured_at, false)}
            </Tooltip>
          </Marker>
        ))}
      {datasets
        .filter((d) => (d.variable === "discharge" ? layers.discharge : layers.level))
        .map((d) => {
          const r = latest[d.dataset_id];
          return (
            <Marker key={d.dataset_id} position={[d.lat, d.lon]} icon={stationIcon}>
              <Tooltip permanent direction="right" offset={[12, 0]}>
                {d.station_name}: {r ? `${fmtNum(r.value, d.unit === "m" ? 2 : 0)} ${d.unit}` : "—"} · SIMULATED
              </Tooltip>
            </Marker>
          );
        })}
      {layers.gauges &&
        placed.map((g) => {
          const near = isNear(g);
          return (
            <Marker key={`${g.station_id}-${near}`} position={[g.lat!, g.lon!]} icon={gaugeIcon}>
              <Tooltip permanent={near} direction="left" offset={[-12, 0]}>
                <strong>{g.name}</strong> · km {fmtNum(g.river_km, 0)} · {fmtNum(g.level_cm, 0)} cm
                {g.change_24h_cm != null && ` (${g.change_24h_cm > 0 ? "+" : ""}${fmtNum(g.change_24h_cm, 0)} / 24 h)`} · {gaugeDate} · ORGANISER
              </Tooltip>
            </Marker>
          );
        })}
      {head && (
        <Marker position={[head.lat, head.lon]} icon={nodeIcon(head.heading_deg)} zIndexOffset={2000}>
          <Tooltip direction="bottom" offset={[0, 18]}>PN-MVP-001 · heading {Math.round(head.heading_deg)}° · {fmtUtc(head.captured_at)}</Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
