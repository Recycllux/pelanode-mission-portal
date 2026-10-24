#!/usr/bin/env python3
"""Build the offline vector basemap (public/basemap/danube-basemap.json) from Natural Earth 1:10m.

The portal draws this under the raster tiles, so the map still has land, borders, rivers, lakes, roads
and towns where tiles can't load (offline demos, sandboxed previews). Natural Earth is public domain.

Usage: python3 scripts/build_basemap.py <dir with Natural Earth .geojson files>
Needs: ne_10m_admin_0_countries, ne_10m_rivers_lake_centerlines, ne_10m_rivers_europe, ne_10m_lakes,
ne_10m_lakes_europe, ne_10m_populated_places_simple, ne_10m_roads (github.com/nvkelso/natural-earth-vector).
"""
import json
import sys
from pathlib import Path

# Danube basin, Black Forest to the Black Sea (covers every gauge the portal shows).
BBOX = (8.0, 41.5, 30.5, 50.5)  # min_lon, min_lat, max_lon, max_lat
TOLERANCE = 0.002  # degrees (~200 m) for Douglas-Peucker
OUT = Path(__file__).resolve().parent.parent / "public" / "basemap" / "danube-basemap.json"


def load(src, name):
    return json.loads((src / f"{name}.geojson").read_text(encoding="utf-8"))["features"]


def simplify(pts, tol=TOLERANCE):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            x, y = pts[i]
            d = abs(dy * (x - x1) - dx * (y - y1)) / norm if norm else ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
            if d > best:
                best, idx = d, i
        if best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def clip_ring(ring):
    """Sutherland-Hodgman clip of a polygon ring to BBOX."""
    x0, y0, x1, y1 = BBOX
    edges = [
        (lambda p: p[0] >= x0, lambda p, q: (x0, p[1] + (q[1] - p[1]) * (x0 - p[0]) / (q[0] - p[0]))),
        (lambda p: p[0] <= x1, lambda p, q: (x1, p[1] + (q[1] - p[1]) * (x1 - p[0]) / (q[0] - p[0]))),
        (lambda p: p[1] >= y0, lambda p, q: (p[0] + (q[0] - p[0]) * (y0 - p[1]) / (q[1] - p[1]), y0)),
        (lambda p: p[1] <= y1, lambda p, q: (p[0] + (q[0] - p[0]) * (y1 - p[1]) / (q[1] - p[1]), y1)),
    ]
    out = ring
    for inside, cut in edges:
        if not out:
            break
        src, out = out, []
        for i, q in enumerate(src):
            p = src[i - 1]
            if inside(q):
                if not inside(p):
                    out.append(cut(p, q))
                out.append(q)
            elif inside(p):
                out.append(cut(p, q))
    return out


def in_bbox(p):
    return BBOX[0] <= p[0] <= BBOX[2] and BBOX[1] <= p[1] <= BBOX[3]


def clip_line(line):
    """Split a line into the runs that lie inside BBOX (points just outside are kept as run ends)."""
    runs, cur = [], []
    for i, p in enumerate(line):
        if in_bbox(p) or (i + 1 < len(line) and in_bbox(line[i + 1])) or (cur and in_bbox(cur[-1])):
            cur.append(p)
        elif cur:
            runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    return [r for r in runs if len(r) > 1]


def rnd(pts):
    return [[round(x, 4), round(y, 4)] for x, y in pts]


def polygons(geom):
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"] if geom["type"] == "MultiPolygon" else []


def lines(geom):
    return [geom["coordinates"]] if geom["type"] == "LineString" else geom["coordinates"] if geom["type"] == "MultiLineString" else []


def area_features(feats, layer, props):
    out = []
    for f in feats:
        polys = []
        for poly in polygons(f["geometry"] or {"type": None}):
            rings = []
            for ring in poly:
                r = simplify(clip_ring([tuple(p[:2]) for p in ring]))
                if len(r) >= 4:
                    rings.append(rnd(r + [r[0]] if r[0] != r[-1] else r))
            if rings:
                polys.append(rings)
        if polys:
            out.append({"type": "Feature", "properties": {"layer": layer, **props(f["properties"])}, "geometry": {"type": "MultiPolygon", "coordinates": polys}})
    return out


def line_features(feats, layer, keep, props):
    out = []
    for f in feats:
        if not f["geometry"] or not keep(f["properties"]):
            continue
        parts = [rnd(simplify(run)) for line in lines(f["geometry"]) for run in clip_line([tuple(p[:2]) for p in line])]
        if parts:
            out.append({"type": "Feature", "properties": {"layer": layer, **props(f["properties"])}, "geometry": {"type": "MultiLineString", "coordinates": parts}})
    return out


def main(src):
    feats = []
    feats += area_features(load(src, "ne_10m_admin_0_countries"), "country", lambda p: {"name": p.get("NAME_EN") or p.get("NAME")})
    feats += area_features(load(src, "ne_10m_lakes") + load(src, "ne_10m_lakes_europe"), "lake", lambda p: {})
    feats += line_features(load(src, "ne_10m_roads"), "road", lambda p: p.get("type") in ("Major Highway", "Secondary Highway") and (p.get("scalerank") or 99) <= 7, lambda p: {"major": p.get("type") == "Major Highway"})
    rivers = load(src, "ne_10m_rivers_lake_centerlines") + load(src, "ne_10m_rivers_europe")
    feats += line_features(rivers, "river", lambda p: p.get("featurecla") != "Lake Centerline", lambda p: {"name": p.get("name"), "rank": p.get("scalerank")})
    for f in load(src, "ne_10m_populated_places_simple"):
        p, c = f["properties"], f["geometry"]["coordinates"]
        if in_bbox(c) and (p.get("scalerank") or 99) <= 8:
            feats.append({"type": "Feature", "properties": {"layer": "place", "name": p.get("name"), "rank": p.get("scalerank"), "capital": bool(p.get("adm0cap"))}, "geometry": {"type": "Point", "coordinates": rnd([c])[0]}})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"type": "FeatureCollection", "attribution": "Natural Earth (public domain)", "bbox": list(BBOX), "features": feats}, separators=(",", ":")), encoding="utf-8")
    print(f"{OUT}: {len(feats)} features, {OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "."))
