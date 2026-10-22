import type { PelaApi } from "./client";
import { HttpApi } from "./http";
import { MockApi } from "./mock";

export * from "./types";
export type { PelaApi } from "./client";
export { PN_KEY_STORAGE } from "./client";

export type ApiMode = "mock" | "http";

/** VITE_API_MODE: "mock" (default) or "http". Anything else falls back to mock. */
export function apiMode(): ApiMode {
  const m = (import.meta.env["VITE_API_MODE"] as string | undefined)?.trim().toLowerCase();
  return m === "http" ? "http" : "mock";
}

let instance: PelaApi | null = null;

/**
 * Single API entry point. http mode uses VITE_API_BASE_URL, or same-origin
 * relative URLs (/api/v1/..., /media/...) when it is empty.
 */
export function api(): PelaApi {
  if (!instance) {
    const base = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.trim() ?? "";
    instance = apiMode() === "http" ? new HttpApi(base) : new MockApi();
  }
  return instance;
}
