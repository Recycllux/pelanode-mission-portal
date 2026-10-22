<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All data access goes through `api()` in `src/api/index.ts`: `VITE_API_MODE=http` uses HttpApi (base `VITE_API_BASE_URL`, or same-origin relative URLs when empty), anything else uses MockApi — so the Spring Boot backend can be swapped in without UI changes.
- API types live only in `src/api/types.ts` with snake_case field names matching the backend contract — never rename fields.
- Static SPA build only (`nitro: false`, `spa.enabled`, shell prerendered to `dist/client/index.html`); no server.ts/start.ts, server functions, Supabase or Cloud — Spring Boot on Cloud Run serves `dist/client` with an index.html fallback.
- Leaflet is imported only by `src/components/pn/MissionMap.tsx`, loaded via `LazyMap` — Leaflet touches `window` at import time.
- Replay state is polled every 1 s while running via `useReplay`; other queries key on mission_time and pass `until=`.
