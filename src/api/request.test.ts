import { beforeEach, expect, test, vi } from "vite-plus/test";
import { adminRequest, commonRequest, orgAdminRequest, request } from "@/api/request";

const storage = new Map<string, string>();
const replace = vi.fn();
const dispatchEvent = vi.fn<(event: Event) => boolean>();

beforeEach((): void => {
  storage.clear();
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    removeItem: (key: string): boolean => storage.delete(key),
  });
  vi.stubGlobal("window", {
    location: { pathname: "/workshop" },
    history: { replaceState: replace },
    dispatchEvent,
  });
  vi.stubGlobal("PopStateEvent", Event);
  vi.stubGlobal("CustomEvent", Event);
});

function respond(code: number, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ code, msg: "错误", data: null }), { status }),
    ),
  );
}

test.each([request, commonRequest, orgAdminRequest])(
  "code 1 clears user session and replaces login route",
  async (send): Promise<void> => {
    storage.set("token", "old");
    storage.set("userId", "user");
    storage.set("currentOrgId", "org");
    storage.set("roles", '["ORG_ADMIN"]');
    storage.set("adminToken", "admin");
    respond(1);
    await expect(send("/resource")).rejects.toThrow();
    expect(storage.get("token")).toBeUndefined();
    expect(storage.get("userId")).toBeUndefined();
    expect(storage.get("currentOrgId")).toBeUndefined();
    expect(storage.get("roles")).toBeUndefined();
    expect(storage.get("adminToken")).toBe("admin");
    expect(replace).toHaveBeenCalledWith(null, "", "/login");
  },
);

test("HTTP 401 clears only admin session and routes to admin login", async (): Promise<void> => {
  storage.set("token", "user");
  storage.set("adminToken", "admin");
  respond(0, 401);
  await expect(adminRequest("/resource")).rejects.toThrow();
  expect(storage.get("token")).toBe("user");
  expect(storage.get("adminToken")).toBeUndefined();
  expect(replace).toHaveBeenCalledWith(null, "", "/admin/login");
});

test("concurrent failures route and announce expiration once", async (): Promise<void> => {
  storage.set("token", "old");
  respond(1);
  await Promise.allSettled([request("/one"), request("/two")]);
  expect(replace).toHaveBeenCalledTimes(1);
  expect(dispatchEvent.mock.calls.filter(([event]) => event.type === "auth-expired")).toHaveLength(
    1,
  );
});

test("public login failures do not redirect", async (): Promise<void> => {
  respond(1);
  await expect(request("/session/pwd")).rejects.toThrow("错误");
  expect(replace).not.toHaveBeenCalled();
});

test("permission denial preserves session", async (): Promise<void> => {
  storage.set("token", "valid");
  respond(3);
  await expect(request("/resource")).rejects.toThrow("错误");
  expect(storage.get("token")).toBe("valid");
  expect(replace).not.toHaveBeenCalled();
});

test("late unauthorized response cannot clear a newer session", async (): Promise<void> => {
  storage.set("token", "old");
  let finish: (value: Response) => void = (): void => {};
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (): Promise<Response> =>
        new Promise((resolve): void => {
          finish = resolve;
        }),
    ),
  );
  const pending = request("/resource");
  storage.set("token", "new");
  finish(new Response("", { status: 401 }));
  await expect(pending).rejects.toThrow();
  expect(storage.get("token")).toBe("new");
  expect(replace).not.toHaveBeenCalled();
});

test("expiration notification is shown once even when callers also show errors", async (): Promise<void> => {
  const events = new EventTarget();
  vi.stubGlobal(
    "window",
    Object.assign(events, {
      location: { pathname: "/workshop" },
      history: { replaceState: replace },
    }),
  );
  const { $tip } = await import("@/components/tip");
  storage.set("token", "old");
  respond(1);
  const errors = await Promise.allSettled([request("/one"), request("/two")]);
  for (const result of errors) {
    if (result.status === "rejected" && result.reason instanceof Error) {
      expect($tip(result.reason.message, "error")).toBe(0);
    }
  }
  // The auth event consumed one tip ID; repeated error handlers consumed none.
  expect($tip("ordinary message")).toBe(2);
});

test("HTTP 401 clears all ordinary session fields", async (): Promise<void> => {
  for (const key of ["token", "userId", "currentOrgId", "roles"]) storage.set(key, "old");
  respond(0, 401);
  await expect(request("/resource")).rejects.toThrow();
  expect(storage.size).toBe(0);
  expect(replace).toHaveBeenCalledWith(null, "", "/login");
});

test("admin code 1 clears all admin fields once for concurrent requests", async (): Promise<void> => {
  for (const key of ["adminToken", "adminId", "adminUsername", "adminRole"])
    storage.set(key, "old");
  storage.set("token", "user");
  respond(1);
  await Promise.allSettled([adminRequest("/one"), adminRequest("/two")]);
  expect([...storage.entries()]).toEqual([["token", "user"]]);
  expect(replace).toHaveBeenCalledTimes(1);
  expect(dispatchEvent.mock.calls.filter(([event]) => event.type === "auth-expired")).toHaveLength(
    1,
  );
});

test("expiration on the login page does not replace the current route", async (): Promise<void> => {
  window.location.pathname = "/login";
  storage.set("token", "old");
  respond(1);
  await expect(request("/resource")).rejects.toThrow();
  expect(storage.get("token")).toBeUndefined();
  expect(replace).not.toHaveBeenCalled();
});

test("public login code 1 can display the server business error", async (): Promise<void> => {
  const { $tip } = await import("@/components/tip");
  respond(1);
  try {
    await request("/session/pwd");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) expect($tip(error.message, "error")).toBeGreaterThan(0);
  }
  expect(replace).not.toHaveBeenCalled();
});

test.each([
  { code: 0, status: 401 },
  { code: 1, status: 200 },
])(
  "public auth errors with expiration text remain visible",
  async ({ code, status }): Promise<void> => {
    const { $tip } = await import("@/components/tip");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (): Promise<Response> =>
          new Response(JSON.stringify({ code, msg: "登录已过期，请重新登录", data: null }), {
            status,
          }),
      ),
    );
    expect.assertions(3);
    try {
      await request("/session/pwd");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) expect($tip(error.message, "error")).toBeGreaterThan(0);
    }
    expect(replace).not.toHaveBeenCalled();
  },
);
