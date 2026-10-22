// @lovable.dev/vite-tanstack-config already includes TanStack Start, React, Tailwind, tsconfig paths,
// VITE_* env injection and the @ alias — do NOT add them manually.
// Static SPA build: no server runtime. `npm run build` writes plain HTML/JS/CSS to dist/client,
// served by the Spring Boot service with an index.html fallback for client-side routes.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    spa: {
      enabled: true,
      prerender: { outputPath: "/index.html", crawlLinks: false, retryCount: 0 },
    },
    prerender: { enabled: false },
  },
});
