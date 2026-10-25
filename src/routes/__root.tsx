import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  ClientOnly,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Go to Mission Map
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. You can try again or head back to the map.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PelaNode Intelligence Portal" },
      { name: "description", content: "Mission-centric water-monitoring portal for PelaNode drifting sensor nodes. Demo data is simulated." },
      { property: "og:title", content: "PelaNode Intelligence Portal" },
      { property: "og:description", content: "Mission-centric water-monitoring portal for PelaNode drifting sensor nodes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Map tile tone (styles.css .pn-muted-tiles): muted greys, but water keeps its blue so the Danube reads as water. */}
        <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
          <filter id="pn-tile-tone" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="saturate" values="0.15" result="grey" />
            {/* Blue excess (B − R, clamped at 0) is found only in water in the OSM palette: less red, more blue there. */}
            <feColorMatrix in="SourceGraphic" type="matrix" values="0.9 0 -0.9 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0 1" result="mask" />
            <feComposite in="grey" in2="mask" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="tinted" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  -0.2 0 0.2 0 0  -1 0 1 0 0  0 0 0 1 0" result="blue" />
            <feComposite in="tinted" in2="blue" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </svg>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* The portal renders client-side only (SPA behaviour); data comes from the API client in src/api. */}
      <ClientOnly fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading PelaNode portal…</div>}>
        <Outlet />
      </ClientOnly>
    </QueryClientProvider>
  );
}
