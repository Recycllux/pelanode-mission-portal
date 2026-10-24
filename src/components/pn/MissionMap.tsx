// Browser-only: imports Leaflet. Load via React.lazy behind <ClientOnly>.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { haversineKm } from "@/api/mock-data";
import type {
  ConfluenceNode,
  ContextDataset,
  ContextRecord,
  DanubeDownstreamWindow,
  DanubeEdge,
  DanubeProfilePoint,
  DanubeStations,
  EventSummary,
  IskarStation,
  TemperatureCandidateAnomaly,
  TrackPoint,
} from "@/api/types";
import { TILES_ENABLED, VectorBasemap } from "./VectorBasemap";
import { LOW_CONFIDENCE, fmtNum, fmtUtc, humanize, reviewTone, windowText } from "@/lib/pn-format";

export interface MapLayers {
  track: boolean;
  events: boolean;
  discharge: boolean;
  level: boolean;
  gauges: boolean;
}

export interface MissionMapProps {
  track: TrackPoint[];
  /** Whole planned route: drawn dashed under the replayed track, and the opening view fits it. */
  route?: TrackPoint[] | undefined;
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
/** Opening view stops here so the river and nearby towns stay in frame around a short route. */
const OPENING_MAX_ZOOM = 13;

function Controller({ focus, track, route, fitAll, initialBbox, datasets, nearGauges }: { focus?: MissionMapProps["focus"]; track: TrackPoint[]; route: TrackPoint[]; fitAll?: boolean | undefined; initialBbox?: MissionMapProps["initialBbox"]; datasets: ContextDataset[]; nearGauges: DanubeProfilePoint[] | null }) {
  const map = useMap();
  const opening = useRef<L.LatLngBounds | null>(null);
  const userMoved = useRef(false);
  const fittedRoute = useRef(false);
  useEffect(() => {
    if (!initialBbox || datasets.length === 0 || !nearGauges) return;
    // Fit once, and once more when the planned route arrives after the other data.
    if (opening.current && (route.length === 0 || fittedRoute.current)) return;
    fittedRoute.current = route.length > 0;
    const [minLon, minLat, maxLon, maxLat] = initialBbox;
    const b = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);
    if (route.length > 0) {
      // The planned route is what the operator wants to see first; stations and gauges stay a pan away.
      for (const p of route) b.extend([p.lat, p.lon]);
    } else {
      for (const d of datasets) b.extend([d.lat, d.lon]);
      for (const g of nearGauges) b.extend([g.lat!, g.lon!]);
    }
    opening.current = b;
    map.invalidateSize();
    map.fitBounds(b, { padding: [40, 40], animate: false, maxZoom: OPENING_MAX_ZOOM });
  }, [initialBbox, datasets, nearGauges, route.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // Phones settle the map's height after first paint (address bar, lazy layout): keep the whole route
  // in view on resize until the user pans or zooms, and offer a button to get back to it.
  useEffect(() => {
    // Real pointer/wheel input only: fitBounds itself fires zoom events.
    const moved = () => (userMoved.current = true);
    const el = map.getContainer();
    el.addEventListener("pointerdown", moved);
    el.addEventListener("wheel", moved, { passive: true });
    const refit = () => {
      map.invalidateSize();
      if (opening.current && !userMoved.current) map.fitBounds(opening.current, { padding: [40, 40], animate: false, maxZoom: OPENING_MAX_ZOOM });
    };
    const ro = new ResizeObserver(refit);
    ro.observe(map.getContainer());
    const Fit = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create("a", "pn-fit-btn");
        btn.href = "#";
        btn.title = "Show the whole route";
        btn.setAttribute("role", "button");
        btn.setAttribute("aria-label", "Show the whole route");
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, "click", (ev) => {
          L.DomEvent.preventDefault(ev);
          if (opening.current) map.fitBounds(opening.current, { padding: [40, 40], maxZoom: OPENING_MAX_ZOOM });
        });
        const bar = L.DomUtil.create("div", "leaflet-bar");
        bar.appendChild(btn);
        return bar;
      },
    });
    const fit = map.zoomControl ? new Fit({ position: "topleft" }).addTo(map) : null;
    return () => {
      el.removeEventListener("pointerdown", moved);
      el.removeEventListener("wheel", moved);
      ro.disconnect();
      fit?.remove();
    };
  }, [map]);
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (fitAll && track.length > 1) map.fitBounds(L.latLngBounds(track.map((p) => [p.lat, p.lon])), { padding: [40, 40] });
  }, [fitAll, track.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MissionMap({ track, route = [], events, datasets = [], gauges, gaugeDate, latest = {}, layers = { track: true, events: true, discharge: false, level: false, gauges: true }, selectedId, focus, onSelectEvent, interactive = true, fitAll, initialBbox }: MissionMapProps) {
  const positions = useMemo(() => track.map((p) => [p.lat, p.lon] as [number, number]), [track]);
  const planned = useMemo(() => route.map((p) => [p.lat, p.lon] as [number, number]), [route]);
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
      center={[43.8725, 25.9785]}
      zoom={15}
      className="pn-muted-tiles pn-vector-base h-full w-full"
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      attributionControl
    >
      {TILES_ENABLED && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" maxZoom={19} />}
      <VectorBasemap />
      <Controller focus={focus} track={track} route={route} fitAll={fitAll} initialBbox={initialBbox} datasets={datasets} nearGauges={nearGauges} />
      {layers.track && planned.length > 1 && (
        <Polyline positions={planned} pathOptions={{ color: TEAL_TRACK, weight: 4, opacity: 0.7, dashArray: "8 8" }}>
          <Tooltip sticky>Planned route · {planned.length} points · REPLAYED</Tooltip>
        </Polyline>
      )}
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
              {near ? (
                // Permanent labels stay short so they fit on a phone; tap the gauge for the rest.
                <Tooltip permanent direction="left" offset={[-12, 0]}>
                  <strong>{g.name}</strong> · {fmtNum(g.level_cm, 0)} cm
                </Tooltip>
              ) : (
                <Tooltip direction="left" offset={[-12, 0]}>
                  <strong>{g.name}</strong> · km {fmtNum(g.river_km, 0)} · {fmtNum(g.level_cm, 0)} cm
                  {g.change_24h_cm != null && ` (${g.change_24h_cm > 0 ? "+" : ""}${fmtNum(g.change_24h_cm, 0)} / 24 h)`} · {gaugeDate} · ORGANISER
                </Tooltip>
              )}
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

/* ---------- Connected river map (P0-19 v1.3): station graph, monitoring windows, candidate anomalies, Iskar handoff ---------- */

export interface RiverMapProps {
  stations: DanubeStations["stations"];
  edges: DanubeEdge[];
  /** Level on the selected day, by station id (organiser data 2021, shown on the 2025 scenario timeline). */
  levels?: Record<string, DanubeProfilePoint> | undefined;
  source?: string | null | undefined;
  /** Operational windows from the source (or from the Iskar handoff gauges), by station id. */
  downstream?: Record<string, DanubeDownstreamWindow> | undefined;
  /** Candidate anomalies on the selected day, by station id. */
  anomalies?: Record<string, TemperatureCandidateAnomaly> | undefined;
  iskar?: { stations: IskarStation[]; confluence: ConfluenceNode } | null | undefined;
  /** Gauges that receive the Iskar handoff (Corabia, Zagrazhden) while a tributary event is open. */
  handoffGauges?: string[] | undefined;
  selectedStation?: string | null | undefined;
  onSelectStation?: ((id: string) => void) | undefined;
  onSelectEdge?: ((e: DanubeEdge) => void) | undefined;
  onSelectIskar?: (() => void) | undefined;
}

const CLASS_STROKE = { A: "var(--teal)", B: "var(--attention)", C: "var(--review)" } as const;

const confluenceIcon = L.divIcon({
  className: "pn-divicon",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 2 L20 11 L11 20 L2 11 Z" fill="var(--attention-soft)" stroke="var(--attention)" stroke-width="2.5" stroke-dasharray="3 2"/></svg>`,
});

function FitRiver({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || points.length < 2) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
  }, [points.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function RiverMap({ stations, edges, levels = {}, source, downstream = {}, anomalies = {}, iskar, handoffGauges = [], selectedStation, onSelectStation, onSelectEdge, onSelectIskar }: RiverMapProps) {
  const placed = useMemo(
    () => stations.filter((s) => s.in_propagation_model && s.station.lat != null && s.station.lon != null),
    [stations],
  );
  const pos = useMemo(() => Object.fromEntries(placed.map((s) => [s.station.station_id, [s.station.lat!, s.station.lon!] as [number, number]])), [placed]);
  const fitPoints = useMemo(() => [...Object.values(pos), ...(iskar ? iskar.stations.map((s) => [s.lat, s.lon] as [number, number]) : [])], [pos, iskar]);

  return (
    <MapContainer center={[43.75, 24.9]} zoom={8} className="pn-muted-tiles pn-vector-base h-full w-full" attributionControl>
      {TILES_ENABLED && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" maxZoom={19} />}
      <VectorBasemap />
      <FitRiver points={fitPoints} />
      {edges.map((e) => {
        const a = pos[e.from_station];
        const b = pos[e.to_station];
        if (!a || !b) return null;
        return (
          <Polyline
            key={`${e.from_station}>${e.to_station}`}
            positions={[a, b]}
            pathOptions={{ color: CLASS_STROKE[e.quality_class], weight: e.quality_class === "A" ? 5 : e.quality_class === "B" ? 4 : 3, opacity: 0.85, dashArray: e.quality_class === "C" ? "6 6" : undefined }}
            eventHandlers={{ click: () => onSelectEdge?.(e) }}
          >
            <Tooltip sticky>
              {e.from_station} → {e.to_station} · class {e.quality_class} · lag {e.optimal_lag_days_level ?? "—"} d (level) / {e.optimal_lag_days_delta_h ?? "—"} d (Δh) · r_Δh {fmtNum(e.r_delta_h ?? 0, 2)} · n {e.n_common_observations}
              {e.reason && ` · ${e.reason}`}
            </Tooltip>
          </Polyline>
        );
      })}
      {iskar && (
        <>
          <Polyline
            positions={[...[...iskar.stations].sort((x, y) => x.lat - y.lat).map((s) => [s.lat, s.lon] as [number, number]), [iskar.confluence.lat, iskar.confluence.lon]]}
            pathOptions={{ color: "var(--attention)", weight: 3, opacity: 0.9, dashArray: "4 6" }}
            eventHandlers={{ click: () => onSelectIskar?.() }}
          >
            <Tooltip sticky>Iskar (2025) · scenario-aligned tributary · no native overlap with Danube 2021</Tooltip>
          </Polyline>
          {iskar.stations.map((s) => (
            <CircleMarker key={s.station_id} center={[s.lat, s.lon]} radius={6} pathOptions={{ color: "var(--attention)", fillColor: "var(--attention-soft)", fillOpacity: 1, weight: 2 }} eventHandlers={{ click: () => onSelectIskar?.() }}>
              <Tooltip direction="left">{s.name} · Iskar discharge (2025) · SCENARIO-ALIGNED</Tooltip>
            </CircleMarker>
          ))}
          <Marker position={[iskar.confluence.lat, iskar.confluence.lon]} icon={confluenceIcon} eventHandlers={{ click: () => onSelectIskar?.() }} zIndexOffset={500}>
            <Tooltip direction="bottom" offset={[0, 10]}>Iskar confluence · Danube ~km {iskar.confluence.river_km} · scenario handoff node</Tooltip>
          </Marker>
        </>
      )}
      {placed.map(({ station: st, has_temperature }) => {
        const id = st.station_id;
        const w = downstream[id];
        const an = anomalies[id];
        const primary = an?.model_output.role === "primary";
        const isSource = id === source;
        const isHandoff = handoffGauges.includes(id);
        const lv = levels[id];
        const fill = isSource || isHandoff ? "var(--navy)" : primary ? "var(--attention)" : w ? "var(--teal)" : an ? "var(--lowconf)" : "var(--card)";
        const permanent = isSource || isHandoff || !!w || primary;
        return (
          <CircleMarker
            key={`${id}-${permanent}`}
            center={pos[id]!}
            radius={isSource || primary || isHandoff ? 9 : w ? 7 : 5}
            pathOptions={{ color: primary ? "var(--review)" : id === selectedStation ? "var(--navy)" : "var(--navy)", weight: id === selectedStation ? 4 : 2, fillColor: fill, fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelectStation?.(id) }}
          >
            <Tooltip permanent={permanent} direction={st.source === "automatic" ? "bottom" : "top"} offset={[0, st.source === "automatic" ? 8 : -8]}>
              <strong>{st.name}</strong>
              {isSource && " · source"}
              {isHandoff && " · Iskar handoff gauge"}
              {w && ` · ${windowText(w.window_days)} (${w.quality_class})`}
              {primary && ` · candidate z ${fmtNum(an!.model_output.robust_z, 1)}`}
              {an && !primary && " · neighbour-influenced"}
              {!permanent && (
                <>
                  {" "}· km {fmtNum(st.river_km ?? 0, 0)}
                  {lv && ` · ${fmtNum(lv.level_cm, 0)} cm`}
                  {lv?.water_temp_c != null && ` · ${fmtNum(lv.water_temp_c, 1)} °C`}
                  {has_temperature ? "" : " · level only"}
                </>
              )}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
