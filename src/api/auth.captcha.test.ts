import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { adminLogin, loginByCode, loginByPassword, sendVerificationCode } from "@/api/auth";

const config = { enabled: true, serverUrl: "https://captcha.example.test", siteKey: "oa" };
const execute = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

function response(data: unknown): Response {
  return Response.json({ code: 0, data });
}

beforeEach((): void => {
  vi.resetAllMocks();
  execute.mockResolvedValue({ success: true, token: "ticket" });
  vi.stubGlobal("window", {
    FCaptcha: { execute, serverUrl: config.serverUrl, configure: vi.fn() },
  });
  vi.stubGlobal("localStorage", { getItem: (): null => null });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

const credentials = { username: "alice", password: "password" };
const loginCases = [
  {
    submit: () => loginByPassword(credentials),
    scope: "common",
    path: "/app/session/pwd",
    action: "app_login_pwd",
  },
  {
    submit: () => loginByCode({ email: "alice@example.test", code: "ABC123" }),
    scope: "common",
    path: "/app/session/email",
    action: "app_login_email",
  },
  {
    submit: () => adminLogin(credentials),
    scope: "admin",
    path: "/admin/session",
    action: "admin_login",
  },
];

test.each(loginCases)(
  "$path submits one ticket for its own login action",
  async ({ submit, scope, path, action }): Promise<void> => {
    fetchMock.mockImplementation(async (input, init): Promise<Response> => {
      if (input === `/${scope}/captcha/config`) return response(config);
      if (input === path && new Headers(init?.headers).get("X-Captcha-Token") === "ticket") {
        return response({ token: "session" });
      }
      return new Response(null, { status: 404 });
    });

    await expect(submit()).resolves.toMatchObject({ token: "session" });
    expect(execute).toHaveBeenCalledExactlyOnceWith(config.siteKey, { action });
  },
);

test("explicitly disabled captcha permits login without an SDK or ticket", async (): Promise<void> => {
  vi.stubGlobal("window", {});
  fetchMock.mockImplementation(async (input, init): Promise<Response> => {
    if (input === "/common/captcha/config") return response({ enabled: false });
    if (input === "/app/session/pwd" && !new Headers(init?.headers).has("X-Captcha-Token")) {
      return response({ token: "session" });
    }
    return new Response(null, { status: 404 });
  });

  await expect(loginByPassword(credentials)).resolves.toMatchObject({ token: "session" });
});

test.each([
  {
    description: "config endpoint fails",
    scopeResponse: () => new Response(null, { status: 503 }),
  },
  {
    description: "config does not specify whether captcha is enabled",
    scopeResponse: () => response({}),
  },
  { description: "challenge succeeds without a ticket", scopeResponse: () => response(config) },
])("login is not sent when $description", async ({ scopeResponse }): Promise<void> => {
  fetchMock.mockImplementation(async (): Promise<Response> => scopeResponse());
  execute.mockResolvedValue({ success: true });

  await expect(loginByPassword(credentials)).rejects.toThrow();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/common/captcha/config"]);
});

test("sending the email code does not depend on captcha", async (): Promise<void> => {
  fetchMock.mockImplementation(
    async (input): Promise<Response> =>
      input === "/app/session/email/code" ? response(null) : new Response(null, { status: 404 }),
  );

  await sendVerificationCode({ email: "alice@example.test", businessType: "LOGIN" });
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/app/session/email/code"]);
});
