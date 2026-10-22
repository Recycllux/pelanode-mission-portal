import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpApi } from "@/api/http";

afterEach(() => vi.unstubAllGlobals());

describe("HttpApi", () => {
  it("uses relative /api/v1 URLs when the base URL is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new HttpApi("").getMission("HACK-001");
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/v1/missions/HACK-001");
  });

  it("uses relative /media URLs when the base URL is empty", () => {
    expect(new HttpApi("").mediaUrl("/media/surface/SURF-003210.jpg")).toBe("/media/surface/SURF-003210.jpg");
  });
});
