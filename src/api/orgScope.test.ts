import { beforeEach, expect, test, vi } from "vite-plus/test";

import { adminRequest, commonRequest, orgAdminRequest, request } from "@/api/request";

const storage = new Map<string, string>();

beforeEach((): void => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      storage.set(key, value);
    },
    removeItem: (key: string): boolean => storage.delete(key),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ code: 0, msg: "ok", data: null }), { status: 200 }),
    ),
  );
});

function sentOrgHeader(): string | null {
  const fetchMock = fetch as unknown as { mock: { calls: [string, RequestInit][] } };
  const init = fetchMock.mock.calls.at(-1)?.[1];
  return new Headers(init?.headers).get("X-Org-Id");
}

test("business, organization admin, and upload requests declare the saved org", async (): Promise<void> => {
  storage.set("token", "user-token");
  storage.set("currentOrgId", "42");
  storage.set("adminToken", "admin-token");

  await request("/projects");
  expect(sentOrgHeader()).toBe("42");

  await request("/projects/1/items?pageNum=1");
  expect(sentOrgHeader()).toBe("42");

  await orgAdminRequest("/orgadmin/organizations");
  expect(sentOrgHeader()).toBe("42");

  await commonRequest("/file/upload", { method: "POST" });
  expect(sentOrgHeader()).toBe("42");
});

test("user and session requests declare the saved org instead of guessing from the path", async (): Promise<void> => {
  storage.set("token", "user-token");
  storage.set("currentOrgId", "42");

  await request("/user/");
  expect(sentOrgHeader()).toBe("42");

  await request("/user/organizations");
  expect(sentOrgHeader()).toBe("42");

  await request("/session/pwd", {
    method: "POST",
    headers: { "X-Org-Id": "other" },
  });
  expect(sentOrgHeader()).toBe("42");

  await request("/user/notices");
  expect(sentOrgHeader()).toBe("42");
});

test("admin requests and an unusable saved org do not declare an organization", async (): Promise<void> => {
  storage.set("adminToken", "admin-token");
  storage.set("currentOrgId", "42");
  await adminRequest("/admin/organizations/");
  expect(sentOrgHeader()).toBeNull();

  storage.set("currentOrgId", "undefined");
  await request("/projects");
  expect(sentOrgHeader()).toBeNull();

  storage.delete("currentOrgId");
  await request("/projects");
  expect(sentOrgHeader()).toBeNull();
});
