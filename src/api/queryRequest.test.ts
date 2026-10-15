import { beforeEach, expect, test, vi } from "vite-plus/test";

import { request } from "@/api/request";
import { runWithRequestContext } from "@/api/requestContext";

const storage = new Map<string, string>();
beforeEach((): void => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storage.get(key) ?? null,
  });
});

test("a scoped query sends its captured token and organization, not current storage", async (): Promise<void> => {
  storage.set("token", "new-token");
  storage.set("currentOrgId", "22");
  const send = vi.fn(
    async (_url: string, _options?: RequestInit): Promise<Response> =>
      new Response('{"code":0,"data":[]}'),
  );
  vi.stubGlobal("fetch", send);
  await runWithRequestContext({ token: "old-token", orgId: "11", managed: true }, () =>
    request("/resource"),
  );
  expect(send.mock.calls[0]?.[1]).toMatchObject({
    headers: { Authorization: "Bearer old-token", "X-Org-Id": "11" },
  });
});

test("cancellation stays an AbortError instead of becoming a network failure", async (): Promise<void> => {
  const controller = new AbortController();
  controller.abort();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (): Promise<Response> => {
      throw new DOMException("Cancelled", "AbortError");
    }),
  );
  await expect(
    runWithRequestContext(
      { token: null, orgId: null, signal: controller.signal, managed: true },
      () => request("/resource"),
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
});
