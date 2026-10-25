"""Build src/data/danube-water.json: the lower Danube's water surface for the offline basemap.

Natural Earth only has a centre line for the Danube, up to 1-2 km off at the zoom the Mission Map opens at.
This takes the river polygons (OpenStreetMap riverbanks) from Overture Maps' base/water theme, read straight
from its public S3 bucket with HTTP range requests, along the Natural Earth line from the Iron Gates to the delta.

    pip install pyarrow shapely
    python3 scripts/build_danube_water.py

Run it after scripts/build_basemap.py: it reads the Danube line from src/data/danube-basemap.json, then cuts
that line (and the borders along the river) back to where the water surface doesn't cover them.
"""

import io
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pyarrow.parquet as pq
from shapely import wkb
from shapely.geometry import box, mapping, shape
from shapely.ops import unary_union

RELEASE = "2026-10-21.0"
BUCKET = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/"
PREFIX = f"release/{RELEASE}/theme=base/type=water/"
DANUBE = ("Danube", "Donau")  # Natural Earth names the upstream stretch Donau
SPAN = box(21.3, 40, 29.8, 50)  # Iron Gates to the delta
CORRIDOR = 0.05  # degrees around the Natural Earth line
MIN_AREA = 2e-6  # square degrees; drops ponds and side channels' slivers
TOLERANCE = 0.0001  # degrees (~10 m)
DATA = Path(__file__).resolve().parent.parent / "src" / "data"


class RangeReader(io.RawIOBase):
    """A seekable file over HTTP range requests, so pyarrow reads only the row groups it needs."""

    def __init__(self, url, size):
        self.url, self.size, self.pos = url, size, 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        self.pos = {0: offset, 1: self.pos + offset, 2: self.size + offset}[whence]
        return self.pos

    def readinto(self, buf):
        n = min(len(buf), self.size - self.pos)
        if n <= 0:
            return 0
        for attempt in range(5):
            try:
                req = urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{self.pos + n - 1}"})
                data = urllib.request.urlopen(req, timeout=180).read()
                break
            except OSError:
                if attempt == 4:
                    raise
        buf[: len(data)] = data
        self.pos += len(data)
        return len(data)


def tiles_along(corridor, step=0.25):
    xmin, ymin, xmax, ymax = corridor.bounds
    out = []
    x = xmin
    while x < xmax:
        y = ymin
        while y < ymax:
            if box(x, y, x + step, y + step).intersects(corridor):
                out.append((x, y, x + step, y + step))
            y += step
        x += step
    return out


def main():
    basemap = json.loads((DATA / "danube-basemap.json").read_text())
    line = unary_union([shape(f["geometry"]) for f in basemap["features"] if f["properties"]["layer"] == "river" and f["properties"].get("name") in DANUBE])
    if line.intersection(SPAN).is_empty:
        raise SystemExit("The Danube line is already cut back: run scripts/build_basemap.py first.")
    corridor = line.intersection(SPAN).buffer(CORRIDOR)
    tiles = tiles_along(corridor)

    def near(xmin, ymin, xmax, ymax):
        return any(xmin <= t[2] and xmax >= t[0] and ymin <= t[3] and ymax >= t[1] for t in tiles)

    listing = urllib.request.urlopen(f"{BUCKET}?list-type=2&prefix={PREFIX}").read().decode()
    files = re.findall(r"<Key>([^<]*)</Key>.*?<Size>(\d+)</Size>", listing)

    def rivers_in(key_size):
        key, size = key_size
        f = pq.ParquetFile(io.BufferedReader(RangeReader(BUCKET + key, int(size)), buffer_size=1 << 22))
        col = {f.schema.column(i).path: i for i in range(f.metadata.num_columns)}
        found = []
        for g in range(f.metadata.num_row_groups):
            stats = lambda path: f.metadata.row_group(g).column(col[path]).statistics  # noqa: E731
            if not near(stats("bbox.xmin").min, stats("bbox.ymin").min, stats("bbox.xmax").max, stats("bbox.ymax").max):
                continue
            for row in f.read_row_group(g, columns=["geometry", "subtype", "bbox"]).to_pylist():
                bb = row["bbox"]
                if row["subtype"] != "river" or not near(bb["xmin"], bb["ymin"], bb["xmax"], bb["ymax"]):
                    continue
                geom = wkb.loads(row["geometry"])
                if geom.geom_type in ("Polygon", "MultiPolygon") and geom.area > MIN_AREA and geom.intersects(corridor):
                    found.append(geom)
        return found

    with ThreadPoolExecutor(8) as pool:
        polys = [p for found in pool.map(rivers_in, files) for p in found]
    surface = unary_union(polys).intersection(corridor).simplify(TOLERANCE)
    feature = {"type": "Feature", "properties": {"layer": "water", "name": "Danube"}, "geometry": mapping(surface)}
    text = json.dumps({"type": "FeatureCollection", "features": [feature]}, separators=(",", ":"))
    out = DATA / "danube-water.json"
    out.write_text(re.sub(r"(\d+\.\d{5})\d+", r"\1", text))
    print(out, out.stat().st_size, "bytes from", len(polys), "polygons")

    # The water now marks the river, and the border that runs down its middle (both up to 1-2 km off).
    for f in basemap["features"]:
        if f["properties"]["layer"] == "river" and f["properties"].get("name") in DANUBE:
            f["geometry"] = mapping(shape(f["geometry"]).difference(SPAN))
        elif f["properties"]["layer"] == "border":
            f["geometry"] = mapping(shape(f["geometry"]).difference(corridor))
    basemap["features"] = [f for f in basemap["features"] if f["geometry"]["coordinates"]]
    text = json.dumps(basemap, separators=(",", ":"))
    (DATA / "danube-basemap.json").write_text(re.sub(r"(\d+\.\d{4})\d+", r"\1", text))


if __name__ == "__main__":
    main()
