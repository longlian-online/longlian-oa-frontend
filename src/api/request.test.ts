import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import {
  adminRequest,
  ApiError,
  commonRequest,
  GatewayError,
  orgAdminRequest,
  request,
} from "@/api/request";
import {
  GATEWAY_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  notificationService,
  resetNotificationService,
} from "@/services/notification";

const storage = new Map<string, string>();
const replace = vi.fn();
const dispatchEvent = vi.fn<(event: Event) => boolean>();

beforeEach((): void => {
  vi.useFakeTimers();
  storage.clear();
  resetNotificationService();
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

afterEach((): void => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

function respond(code: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ code, msg: "错误", data: null })),
    ),
  );
}

test.each([request, commonRequest, orgAdminRequest])(
  "code 1 clears user session and replaces login route",
  async (send): Promise<void> => {
    storage.set("token", "old");
    storage.set("userId", "user");
    storage.set("currentOrgId", "org");
    storage.set("role", "ORG_ADMIN");
    storage.set("roles", '["ORG_ADMIN"]');
    storage.set("adminToken", "admin");
    respond(1);
    await expect(send("/resource")).rejects.toThrow();
    expect(storage.get("token")).toBeUndefined();
    expect(storage.get("userId")).toBeUndefined();
    expect(storage.get("currentOrgId")).toBeUndefined();
    expect(storage.get("role")).toBeUndefined();
    expect(storage.get("roles")).toBeUndefined();
    expect(storage.get("adminToken")).toBe("admin");
    expect(replace).toHaveBeenCalledWith(null, "", "/login");
  },
);

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
  finish(new Response(JSON.stringify({ code: 1, msg: "错误", data: null })));
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

test("public login code 1 reports the server business error", async (): Promise<void> => {
  const listener = vi.fn();
  notificationService.subscribe(listener);
  respond(1);
  await expect(request("/session/pwd")).rejects.toThrow("错误");
  await vi.runAllTimersAsync();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith({ type: "error", message: "错误" });
  expect(replace).not.toHaveBeenCalled();
});

test("public auth errors with expiration text remain visible", async (): Promise<void> => {
  const listener = vi.fn();
  notificationService.subscribe(listener);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ code: 1, msg: "登录已过期，请重新登录", data: null })),
    ),
  );
  await expect(request("/session/pwd")).rejects.toThrow("登录失败：登录已过期，请重新登录");
  await vi.runAllTimersAsync();
  expect(listener).toHaveBeenCalledWith({
    type: "error",
    message: "登录失败：登录已过期，请重新登录",
  });
  expect(replace).not.toHaveBeenCalled();
});

test("non-200 responses notify once and keep the session", async (): Promise<void> => {
  const listener = vi.fn();
  notificationService.subscribe(listener);
  storage.set("token", "user");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ code: 0, msg: "bad gateway", data: null }), { status: 502 }),
    ),
  );

  const rejection: unknown = await request("/resource").catch((error: unknown) => error);

  expect(rejection).toBeInstanceOf(GatewayError);
  if (rejection instanceof GatewayError) {
    expect(rejection.status).toBe(502);
    expect(rejection.message).toBe(GATEWAY_ERROR_MESSAGE);
  }
  expect(storage.get("token")).toBe("user");
  expect(replace).not.toHaveBeenCalled();
  await vi.runAllTimersAsync();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith({ type: "error", message: GATEWAY_ERROR_MESSAGE });
});

test("concurrent gateway failures notify once inside the dedupe window", async (): Promise<void> => {
  const listener = vi.fn();
  notificationService.subscribe(listener);
  storage.set("token", "user");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (): Promise<Response> =>
        new Response(JSON.stringify({ code: 0, msg: "bad gateway", data: null }), { status: 502 }),
    ),
  );

  await Promise.allSettled([request("/one"), request("/two")]);

  await vi.runAllTimersAsync();
  expect(listener).toHaveBeenCalledTimes(1);
});

test("callers cannot show a second gateway tip", async (): Promise<void> => {
  const events = new EventTarget();
  vi.stubGlobal(
    "window",
    Object.assign(events, {
      location: { pathname: "/workshop" },
      history: { replaceState: replace },
    }),
  );
  const { $tip } = await import("@/components/tip");

  expect($tip(GATEWAY_ERROR_MESSAGE, "error")).toBe(0);
});

test("business failures notify the server message and keep the session", async (): Promise<void> => {
  const listener = vi.fn();
  notificationService.subscribe(listener);
  storage.set("token", "valid");
  respond(3);
  await expect(request("/resource")).rejects.toThrow("错误");
  await vi.runAllTimersAsync();
  expect(storage.get("token")).toBe("valid");
  expect(replace).not.toHaveBeenCalled();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith({ type: "error", message: "错误" });
});

test("silenced api errors do not notify", async (): Promise<void> => {
  const listener = vi.fn();
  notificationService.subscribe(listener);
  storage.set("token", "valid");
  respond(3);
  await request("/resource").catch((error: unknown) => {
    if (error instanceof ApiError) error.silence();
  });
  await vi.runAllTimersAsync();
  expect(listener).not.toHaveBeenCalled();
  expect(storage.get("token")).toBe("valid");
});

test("network failures notify without clearing the session", async (): Promise<void> => {
  const listener = vi.fn();
  notificationService.subscribe(listener);
  storage.set("token", "user");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("Failed to fetch"))),
  );
  await expect(request("/resource")).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  await vi.runAllTimersAsync();
  expect(listener).toHaveBeenCalledWith({ type: "error", message: NETWORK_ERROR_MESSAGE });
  expect(storage.get("token")).toBe("user");
  expect(replace).not.toHaveBeenCalled();
});
