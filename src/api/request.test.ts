import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("@/components/tip", () => ({ $tip: vi.fn() }));

import { adminRequest, request } from "@/api/request";
import { $tip } from "@/components/tip";
import { ApiError, showApiError } from "@/lib/apiError";
import { registerAuthNavigate, UnauthorizedError } from "@/lib/authRedirect";
import { getAdminToken, getToken, saveAdminSession, saveSession } from "@/lib/session";
import type { AdminLoginVO, LoginVO } from "@/types/auth";

const store = new Map<string, string>();

const USER_SESSION: LoginVO = {
  userId: "1",
  currentOrgId: "2",
  token: "user-token",
  roles: ["ORG_ADMIN"],
};

const ADMIN_SESSION: AdminLoginVO = {
  adminId: "9",
  username: "root",
  role: "SUPER_ADMIN",
  token: "admin-token",
};

vi.stubGlobal("localStorage", {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItem: (key: string): void => {
    store.delete(key);
  },
  clear: (): void => {
    store.clear();
  },
});

const navigate = vi.fn<(to: string, options?: { replace?: boolean }) => void>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  store.clear();
  navigate.mockClear();
  vi.mocked($tip).mockClear();
  registerAuthNavigate(navigate);
  saveSession(USER_SESSION);
});

describe("request", () => {
  test("成功响应返回 data 并携带用户 token", async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({ code: 0, msg: "操作成功", data: { total: 3 } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(request<{ total: number }>("/projects")).resolves.toEqual({ total: 3 });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;

    expect(url).toContain("/app/projects");
    expect(headers.Authorization).toBe("Bearer user-token");
  });

  test("业务 code 1 清理用户会话并跳转登录页", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: 1, msg: "未授权访问" })),
    );

    await expect(request("/projects")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
    expect(vi.mocked($tip)).toHaveBeenCalledTimes(1);
  });

  test("并发业务 code 1 只清态提示跳转一次", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: 1 })),
    );

    const results = await Promise.allSettled([request("/a"), request("/b"), request("/c")]);

    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(vi.mocked($tip)).toHaveBeenCalledTimes(1);
  });

  test("业务 code 3 只提示错误不清理会话", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: 3, msg: "无权操作" })),
    );

    await expect(request("/orgadmin/task/base/list")).rejects.toMatchObject({
      code: 3,
      message: "无权操作",
    });
    expect(getToken()).toBe("user-token");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("HTTP 403 保留后端提示且不清理会话", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: 3, msg: "无权操作" }, 403)),
    );

    await expect(request("/admin/admins")).rejects.toMatchObject({
      code: 3,
      message: "无权操作",
    });
    expect(getToken()).toBe("user-token");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("HTTP 401 无响应体时同样触发登录跳转", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 401 })),
    );

    await expect(request("/projects")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  test("公开接口的业务 code 1 不清理会话并保留后端提示", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: 1, msg: "验证码错误" })),
    );

    await expect(request("/session/pwd", { method: "POST", auth: "none" })).rejects.toMatchObject({
      code: 1,
      message: "验证码错误",
    });
    expect(getToken()).toBe("user-token");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("管理端业务 code 1 只清理管理端会话并跳转管理端登录", async () => {
    saveAdminSession(ADMIN_SESSION);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: 1, msg: "未授权访问" })),
    );

    await expect(adminRequest("/admin/organizations")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getAdminToken()).toBeNull();
    expect(getToken()).toBe("user-token");
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/admin/login", { replace: true });
  });
});

describe("showApiError", () => {
  test("未认证错误由请求层统一处理，页面不再重复提示", () => {
    showApiError(new UnauthorizedError("user"), "兜底提示");
    expect(vi.mocked($tip)).not.toHaveBeenCalled();
  });

  test("普通错误展示错误信息", () => {
    showApiError(new ApiError("无权操作", 3), "兜底提示");
    expect(vi.mocked($tip)).toHaveBeenCalledWith("无权操作", "error");
  });
});
