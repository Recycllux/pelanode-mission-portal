# PelaNode Mission Portal

Build the front end of **PelaNode Intelligence Portal**, a mission-centric web app for water-monitoring operators. A floating sensor node ("PelaNode") drifts down a river with a surface camera and an underwater camera. The app shows where the node went, what it observed, which observations became AI-generated events, what external water data coincides with them, and lets an operator review the events and export a report. This build is for a hackathon demo: **all data is simulated or replayed and must be labelled as such.**

### Hard technical constraints (do not deviate)
- **Front end only.** React + Vite + TypeScript, Tailwind, shadcn/ui, React Router. Client-side SPA, static build into `dist/`. **No SSR, no server functions, no Supabase, no Lovable Cloud, no auth, no database.** The real backend is a separate Spring Boot service that will serve this static bundle.
- All data goes through one typed API client in `src/api/` with two implementations behind one interface:
  - `HttpApi`: calls `${VITE_API_BASE_URL}/api/v1/...` (endpoints below).
  - `MockApi`: in-memory data + a simulated replay clock, used when `VITE_API_BASE_URL` is empty. Default = MockApi so the preview works.
- Every POST sends header `X-PN-Key` with a value stored in localStorage (set in a hidden Admin panel, see below). Never display the key.
- Polling every 1 s while replay is running (no websockets).
- Map: **react-leaflet** with OpenStreetMap tiles (no Mapbox, no API tokens). Charts: **Recharts**.
- Keep all TypeScript types in `src/api/types.ts`, field names exactly as below (snake_case), so the real API can be swapped in without changes.

### API contract (HttpApi must call exactly these)
- `GET /missions/{id}` → mission + node + counts
- `GET /missions/{id}/track?until=<ISO>` → TrackPoint[]
- `GET /events?mission_id=HACK-001&until=<ISO>` → Event[] (summary)
- `GET /events/{id}` → full Event (shape below)
- `POST /events/{id}/review` body `{action: "confirm"|"reject"|"relabel", new_label?, note?, reviewer, request_id(uuid)}`
- `GET /missions/{id}/context` → `{datasets[], records[]}`
- `GET /nodes/{id}/status?mission_id=` → `{battery_pct, connectivity, storage_pct, gnss_quality}`
- `GET /missions/{id}/replay` → `{state: "idle"|"running"|"paused"|"ended", mission_time, speed, started_at}`
- `POST /missions/{id}/replay` body `{action: "start"|"pause"|"resume"|"seek"|"speed", to?, speed?}`
- `GET /missions/{id}/report` → summary; `POST /missions/{id}/export` body `{format: "csv"|"geojson"|"json"|"html"}` → `{file_uri}`
- `POST /demo/reset` body `{mission_id}`
- Images: `GET /media/...` (outside `/api/v1`)

The UI shows only data at or before `mission_time` (use `until=`).

### Event shape (full view)
```json
{
  "event_id": "EV-0142", "mission_id": "HACK-001", "node_id": "PN-MVP-001",
  "event_type": "anthropogenic_debris", "perspective": "above",
  "captured_at": "2026-10-24T14:32:00.000Z",
  "position": { "lat": 43.9012, "lon": 25.9341, "h_acc_m": 3.0, "source": "replayed" },
  "observation": { "observation_id": "OBS-HACK-001-S-0142", "source_sensor": "camera_surface",
    "paired_observation_id": "OBS-HACK-001-U-0142",
    "evidence": { "frame_uri": "/media/surface/SURF-003210.jpg", "thumb_uri": null, "crop_uri": null, "provenance": "placeholder" },
    "quality_score": 0.84 },
  "model_output": { "model_output_id": "MO-HACK-001-0142", "class": "anthropogenic_debris", "confidence": 0.93,
    "bbox": [412, 288, 96, 64], "model_id": "pn-det", "model_version": "0.1", "inference_origin": "simulated" },
  "context": [ { "dataset_id": "sim_hydro_discharge", "provider": "Simulated (NIMH-style)", "variable": "discharge",
    "value": 1173.0, "unit": "m3/s", "observed_at": "2026-10-24T14:22:00.000Z", "station_name": "Simulated station 1",
    "distance_km": 11.2, "time_offset_min": -10, "relation": "coincides_with", "provenance": "simulated" } ],
  "attention": "review_required", "attention_reasons": ["score_above_threshold"],
  "review": { "status": "unreviewed", "current_label": null, "last_action": null, "by": null, "at": null },
  "data_origin": "replayed",
  "device": { "battery_pct": 82, "connectivity": "online", "storage_pct": 41 }
}
```

### Mock data (MockApi) — mission HACK-001
- Mission "Danube high-flow reconnaissance", node PN-MVP-001, mode drift, window **2026-10-24 14:22Z → 15:04Z**, data_origin simulated.
- Track: **43 points, one per minute**, smooth eastward drift of about **1.7 km** starting near lat 43.899, lon 25.920 (Lower Danube, synthetic).
- Events (appear when the clock passes their time):
  - **EV-0142** 14:32Z, perspective above (surface camera), anthropogenic_debris, 0.93, frame SURF-003210
  - **EV-0143** 14:37Z, perspective below (underwater camera), submerged_debris, 0.82, frame UW-003892, context discharge ≈1,173 m3/s
  - **EV-0144** 14:41Z, perspective below, surface_anomaly, 0.76, quality flag low_visibility, attention review_required
- Context series (hourly): discharge rising **820 → 1,256 m3/s** from 08:22Z to 15:22Z; water level **4.10 → 5.36 m** same window; label "SIMULATED CONTEXT".
- Replay speeds: 1x, 2x, 5x, **demo = 100x** (the 42-minute mission plays in ~25 s).
- Images: no real frames yet. Use a neutral placeholder (water-blue for above, dark teal for below) with the frame ID printed on it; if `frame_uri` fails to load, show the same placeholder with "Frame not available".

### Screens (build in this order)
1. **Mission Map (home)** — full-height map: track (teal line), node marker with heading (orange), event markers coloured by review state and shaped by perspective (circle = above, triangle = below; hollow if confidence < 0.6). Right panel: mission status (mission, node, mode, elapsed time, distance, battery, connectivity, GNSS), event counts, **Review queue** (review_required first, then by confidence; click centres the map and opens the event). Left: layer toggles (track, events, discharge, level) each with source chip. Bottom: **time bar** with Start / Pause / Resume, speed selector, scrubber (seek), event ticks, and the current mission time in UTC.
2. **Event Detail** (drawer or page from any event click) — evidence frame(s) with the bbox drawn; facts: time (UTC), coordinates ± accuracy, perspective, class, confidence, quality, model version, data origin. **Five provenance layers as separate labelled blocks:** PelaNode evidence (observation), AI-generated event (model output), Human review, Associated dataset (context: dataset, value + unit, station, distance, time offset, "coincides with — association only, not cause"), System-generated summary. Review buttons: **Confirm, Reject, Relabel** (+ note). After review, the original model output stays visible beside the review result. Previous / next event, "Show on map".
3. **Event Timeline** — list of events in time order with filters (review status, perspective, class) and a small context chart above it with event markers; click opens Event Detail.
4. **Reports** — summary cards (observations, events, review required, reviewed, path length), event table, and buttons "Generate report (HTML)", "Download CSV", "Download GeoJSON" calling the export endpoint. A printable report page: title, mission, period, SIMULATED flag, map snapshot, events with evidence, context values with sources, review status, **provenance footer** (data origin, model version, datasets, generation time).

Placeholders only (nav items present, simple "coming soon" shell): Environmental Context, Dual Vision, Analytics, Nodes, Settings.

### Hidden Admin panel
Route `/admin` (not in navigation): field to store the X-PN-Key in localStorage, buttons **Reset demo**, replay speed, and a toggle Context source (organiser / simulated) that is display-only in the mock.

### Header (every screen)
PelaNode wordmark, screen name, mission name, node status chip, and a permanent **SIMULATED** badge (striped). Navigation: Mission Map, Events, Datasets, Reports, Settings.

### Wording rules (strict)
- Use "Review required", "possible", "coincides with", "associated". **Never** "incident", "confirmed pollution", "caused by", "risk score".
- Never show a numeric risk or priority score.
- Every value carries its source chip; simulated data is always visibly labelled.
- Low confidence is de-emphasised (hollow / grey), never hidden.

### Visual design
- Palette: navy header and text, teal for tracks and primary actions, orange for node and attention, red for review required, grey for low confidence. Clean, light, public-sector style; light muted basemap.
- One sans-serif font (Inter), tabular numbers.
- Desktop first at **1920×1080** (it will be screen-shared in a pitch), still usable on a tablet. Large click targets.
- Priority never by colour alone: icon + text. Contrast ≥ 4.5:1.
- Language: English.

### Acceptance for this first build
- Preview opens on Mission Map with HACK-001, SIMULATED badge visible.
- Pressing Start at demo speed moves the node along 43 points in ~25 s; EV-0142, EV-0143, EV-0144 appear at their times.
- Clicking EV-0143 shows evidence, model output, context with "coincides with", and review buttons; Confirm keeps the original model output visible.
- Switching `VITE_API_BASE_URL` to a real URL needs no code change.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b7ad2432-01ca-4b3b-a6cf-845144301d5c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Offline basemap
The maps draw a vector basemap (land, borders, rivers, lakes, roads, towns from Natural Earth, public domain)
under the OpenStreetMap tiles, so they stay readable where tiles can't load. It lives in
`public/basemap/danube-basemap.json`; rebuild it with `python3 scripts/build_basemap.py <natural-earth-geojson-dir>`.
Set `VITE_MAP_TILES=off` to skip the OSM tiles entirely (for previews where external images are blocked).
