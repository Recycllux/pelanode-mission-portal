import type { PelaApi } from "./client";
import { HttpApi } from "./http";
import { MockApi } from "./mock";

export * from "./types";
export type { PelaApi } from "./client";
export { PN_KEY_STORAGE } from "./client";

let instance: PelaApi | null = null;

/** Single API entry point: HttpApi when VITE_API_BASE_URL is set, MockApi otherwise. */
export function api(): PelaApi {
  if (!instance) {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";
    instance = base ? new HttpApi(base) : new MockApi();
  }
  return instance;
}
