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
- All data access goes through `api()` in `src/api/index.ts` (HttpApi when `VITE_API_BASE_URL` is set, MockApi otherwise) — so the Spring Boot backend can be swapped in without UI changes.
- API types live only in `src/api/types.ts` with snake_case field names matching the backend contract — never rename fields.
- No server functions, Supabase or Cloud: the app is a client-rendered front end (root wraps `<Outlet />` in `<ClientOnly>`) because a separate backend serves it.
- Leaflet is imported only by `src/components/pn/MissionMap.tsx`, loaded via `LazyMap` — Leaflet touches `window` at import time.
- Replay state is polled every 1 s while running via `useReplay`; other queries key on mission_time and pass `until=`.
