// Browser-only (imports Leaflet): offline vector basemap drawn under the raster tiles.
// Data: src/data/danube-basemap.json (its own lazy chunk), built from Natural Earth by scripts/build_basemap.py.
// Where tiles load they cover it; where they can't (offline, sandboxed previews) the map keeps
// land, borders, rivers, lakes, roads and towns.
import L from "leaflet";
import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";

type Feature = GeoJSON.Feature<GeoJSON.Geometry, { layer: string; name?: string; rank?: number; major?: boolean; capital?: boolean }>;

let cache: Promise<Feature[]> | null = null;
function loadBasemap() {
  // A lazy import (not fetch) so it loads wherever the app's own scripts do, including sandboxed previews.
  cache ??= import("@/data/danube-basemap.json")
    .then((m) => (m.default as unknown as { features: Feature[] }).features)
    .catch(() => []);
  return cache;
}

/** Raster tiles are on unless VITE_MAP_TILES=off (builds that run where external images are blocked). */
export const TILES_ENABLED = (import.meta.env["VITE_MAP_TILES"] as string | undefined)?.trim().toLowerCase() !== "off";

const style = (f: Feature | undefined): L.PathOptions => {
  const p = f?.properties;
  switch (p?.layer) {
    case "country":
      return { color: "#a8a29e", weight: 1, dashArray: "4 3", fillColor: "#f5f3ee", fillOpacity: 1 };
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

const ORDER = ["country", "lake", "road", "river"];

export function VectorBasemap() {
  const map = useMap();
  const [features, setFeatures] = useState<Feature[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadBasemap().then((f) => live && setFeatures(f));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!features?.length) return;
    if (!map.getPane("pn-basemap")) {
      map.createPane("pn-basemap").style.zIndex = "150";
      map.createPane("pn-basemap-labels").style.zIndex = "390";
    }
    map.attributionControl?.addAttribution("Natural Earth");
    const renderer = L.canvas({ pane: "pn-basemap" });
    const shapes = L.geoJSON(
      { type: "FeatureCollection", features: features.filter((f) => f.properties.layer !== "place").sort((a, b) => ORDER.indexOf(a.properties.layer) - ORDER.indexOf(b.properties.layer)) } as GeoJSON.FeatureCollection,
      { pane: "pn-basemap", interactive: false, style: (f) => ({ ...style(f as Feature), renderer }) },
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
      map.attributionControl?.removeAttribution("Natural Earth");
      shapes.remove();
      for (const { m } of places) m.remove();
    };
  }, [features, map]);

  return null;
}
