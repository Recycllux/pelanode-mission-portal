// Browser-only: imports Leaflet. Load via React.lazy behind <ClientOnly>.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { ContextDataset, ContextRecord, EventSummary, TrackPoint } from "@/api/types";
import { LOW_CONFIDENCE, fmtNum, fmtUtc, humanize, reviewTone } from "@/lib/pn-format";

export interface MapLayers {
  track: boolean;
  events: boolean;
  discharge: boolean;
  level: boolean;
}

export interface MissionMapProps {
  track: TrackPoint[];
  events: EventSummary[];
  datasets?: ContextDataset[];
  latest?: Record<string, ContextRecord | undefined>;
  layers?: MapLayers;
  selectedId?: string;
  focus?: { lat: number; lon: number; key: string } | null;
  onSelectEvent?: (id: string) => void;
  interactive?: boolean;
  fitAll?: boolean;
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

function Controller({ focus, track, fitAll }: { focus?: MissionMapProps["focus"]; track: TrackPoint[]; fitAll?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (fitAll && track.length > 1) map.fitBounds(L.latLngBounds(track.map((p) => [p.lat, p.lon])), { padding: [40, 40] });
  }, [fitAll, track.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MissionMap({ track, events, datasets = [], latest = {}, layers = { track: true, events: true, discharge: false, level: false }, selectedId, focus, onSelectEvent, interactive = true, fitAll }: MissionMapProps) {
  const positions = useMemo(() => track.map((p) => [p.lat, p.lon] as [number, number]), [track]);
  const head = track.at(-1);

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
      <Controller focus={focus} track={track} fitAll={fitAll} />
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
      {head && (
        <Marker position={[head.lat, head.lon]} icon={nodeIcon(head.heading_deg)} zIndexOffset={2000}>
          <Tooltip direction="bottom" offset={[0, 18]}>PN-MVP-001 · heading {Math.round(head.heading_deg)}° · {fmtUtc(head.t)}</Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
