// Browser-only (imports Leaflet): offline vector basemap drawn under the raster tiles.
// Data (lazy chunks, built from Natural Earth by scripts/build_basemap.py):
//   src/data/world-basemap.json   1:50m, whole world, so the map never ends at the basin's edge
//   src/data/danube-basemap.json  1:10m, Danube basin, drawn on top with roads and more towns
// Where tiles load they cover it; where they can't (offline, sandboxed previews) the map keeps
// land, borders, rivers, lakes, roads and towns.
import L from "leaflet";
import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";

type Feature = GeoJSON.Feature<GeoJSON.Geometry, { layer: string; name?: string; rank?: number; major?: boolean; capital?: boolean }>;
type Level = "world" | "detail";

const cache: Partial<Record<Level, Promise<Feature[]>>> = {};
function loadBasemap(level: Level) {
  // A lazy import (not fetch) so it loads wherever the app's own scripts do, including sandboxed previews.
  cache[level] ??= (level === "world" ? import("@/data/world-basemap.json") : import("@/data/danube-basemap.json"))
    .then((m) => (m.default as unknown as { features: Feature[] }).features)
    .catch(() => []);
  return cache[level]!;
}

/** Raster tiles are on unless VITE_MAP_TILES=off (builds that run where external images are blocked). */
export const TILES_ENABLED = (import.meta.env["VITE_MAP_TILES"] as string | undefined)?.trim().toLowerCase() !== "off";

const LAND = "#f5f3ee";

const style = (f: Feature | undefined, level: Level): L.PathOptions => {
  const p = f?.properties;
  switch (p?.layer) {
    case "country":
      // Detail polygons are clipped to the basin, so they are fill only; their borders are "border" lines.
      return level === "world" ? { color: "#a8a29e", weight: 1, dashArray: "4 3", fillColor: LAND, fillOpacity: 1 } : { stroke: false, fillColor: LAND, fillOpacity: 1 };
    case "border":
      return { color: "#a8a29e", weight: 1, dashArray: "4 3" };
    case "lake":
      return { stroke: false, fillColor: "#b9d7ea", fillOpacity: 1 };
    case "river":
      return { color: "#7fb3d5", weight: p.name === "Danube" ? 4 : (p.rank ?? 9) <= 6 ? 2 : 1.2, opacity: 1 };
    case "road":
      return { color: p.major ? "#e2b07a" : "#d6d3d1", weight: p.major ? 1.6 : 1, opacity: 0.9 };
    default:
      return {};
  }
};

const ORDER = ["country", "lake", "border", "road", "river"];

function addLevel(map: L.Map, level: Level, features: Feature[]) {
  const pane = `pn-basemap-${level}`;
  if (!map.getPane(pane)) map.createPane(pane).style.zIndex = level === "world" ? "140" : "150";
  if (!map.getPane("pn-basemap-labels")) map.createPane("pn-basemap-labels").style.zIndex = "390";
  const renderer = L.canvas({ pane });
  const shapes = L.geoJSON(
    { type: "FeatureCollection", features: features.filter((f) => f.properties.layer !== "place").sort((a, b) => ORDER.indexOf(a.properties.layer) - ORDER.indexOf(b.properties.layer)) } as GeoJSON.FeatureCollection,
    { pane, interactive: false, style: (f) => ({ ...style(f as Feature, level), renderer }) },
  ).addTo(map);

  const places = features
    .filter((f) => f.properties.layer === "place" && f.geometry.type === "Point")
    .map((f) => {
      const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const m = L.marker([lat, lon], {
        pane: "pn-basemap-labels",
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: `pn-place${f.properties.capital ? " pn-place--capital" : ""}`, iconSize: [0, 0], html: `<span>${f.properties.name ?? ""}</span>` }),
      });
      return { m, rank: f.properties.rank ?? 10 };
    });
  // Show more towns as the user zooms in.
  const sync = () => {
    const z = map.getZoom();
    for (const { m, rank } of places) {
      const show = rank <= z - 1;
      if (show && !map.hasLayer(m)) m.addTo(map);
      else if (!show && map.hasLayer(m)) m.remove();
    }
  };
  sync();
  map.on("zoomend", sync);
  return () => {
    map.off("zoomend", sync);
    shapes.remove();
    for (const { m } of places) m.remove();
  };
}

export function VectorBasemap() {
  const map = useMap();
  const [levels, setLevels] = useState<Partial<Record<Level, Feature[]>>>({});
  useEffect(() => {
    let live = true;
    for (const level of ["world", "detail"] as const) void loadBasemap(level).then((f) => live && setLevels((s) => ({ ...s, [level]: f })));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!levels.world?.length) return;
    map.attributionControl?.addAttribution("Natural Earth");
    const off = addLevel(map, "world", levels.world);
    return () => {
      map.attributionControl?.removeAttribution("Natural Earth");
      off();
    };
  }, [levels.world, map]);

  useEffect(() => (levels.detail?.length ? addLevel(map, "detail", levels.detail) : undefined), [levels.detail, map]);

  return null;
}
