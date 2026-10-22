// @vitest-environment happy-dom
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
  type QueryClient,
} from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import AppHeader from "@/components/layout/AppHeader";
import {
  clearSession,
  saveSession,
  saveCurrentOrganization,
  saveRotatedCredentials,
  getSessionSnapshot,
} from "@/lib/session";
import { createQueryClient } from "@/lib/queryClient";
import { scopedKey } from "@/lib/queryKeys";
import { notificationService } from "@/services/notification";
import type { NotificationVO } from "@/types/notifications";
import type { UseOrganizationSwitcherResult } from "@/hooks/useOrganizationSwitcher";
import type { UserInfoVO } from "@/types/user";

const { bindEmail, sendVerificationCode, currentUser } = vi.hoisted(() => ({
  bindEmail: vi.fn(async () => undefined),
  sendVerificationCode: vi.fn(async () => undefined),
  currentUser: {
    user: null as UserInfoVO | null,
    role: null as string | null,
  },
}));

vi.mock("@/api/user", () => ({
  bindEmail,
  changePassword: vi.fn(),
  getInviteInfo: vi.fn(),
  joinOrganizationByInvite: vi.fn(),
  updateMyInfo: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  sendVerificationCode,
  logout: vi.fn(),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: currentUser.user,
    role: currentUser.role,
    isLoading: false,
    isAuthenticated: currentUser.user !== null,
    error: null,
    refresh: async () => undefined,
  }),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", setTheme: () => undefined }),
}));

vi.mock("@/hooks/useUploadFile", () => ({
  useUploadFile: () => ({ uploading: false, uploadFile: async () => ({ fileId: "1" }) }),
}));

vi.mock("@/hooks/usePendingPathname", () => ({
  usePendingPathname: () => "/dashboard/planning",
}));

const TOKEN = "session-token";

const switcher: UseOrganizationSwitcherResult = {
  organizations: [],
  recentOrganizations: [],
  currentOrgId: null,
  isLoading: false,
  error: null,
  switchingOrgId: null,
  refreshOrganizations: async () => undefined,
  switchOrganization: async () => undefined,
};

function user(email: string | null): UserInfoVO {
  return { id: "1", username: "legacy", nickname: "遗留用户", email };
}

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  currentUser.user = user(null);
  currentUser.role = null;
  bindEmail.mockReset();
  bindEmail.mockResolvedValue(undefined);
  sendVerificationCode.mockReset();
  sendVerificationCode.mockResolvedValue(undefined);
  saveSession({ token: TOKEN, userId: "1" });
  client = createQueryClient();
  notifyError.mockClear();
  vi.spyOn(notificationService, "notify").mockImplementation(notifyError);
  inboxRows = makeRows(25);
  serve = defaultServe;
  send.mockReset();
  send.mockImplementation((input, options) =>
    serve(new URL(input, window.location.origin), options ?? {}),
  );
  vi.stubGlobal("fetch", send);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach((): void => {
  act(() => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(headerKey: number = 0): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/dashboard/planning"]}>
          <AppHeader key={headerKey} switcher={switcher} onMore={() => undefined} />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

function buttonsNamed(name: string, scope: ParentNode = document): HTMLButtonElement[] {
  return Array.from(scope.querySelectorAll("button")).filter(
    (button): button is HTMLButtonElement => button.textContent?.replace(/\s+/g, "") === name,
  );
}

async function click(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.click();
  });
}

async function typeInto(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test.each([null, "", "  "])("邮箱 %j 时显示绑定邮箱", async (email): Promise<void> => {
  currentUser.user = user(email);
  await mount();
  expect(buttonsNamed("绑定邮箱")).toHaveLength(1);
  expect(buttonsNamed("修改密码")).toHaveLength(1);
});

test("已绑定邮箱时不显示绑定入口", async (): Promise<void> => {
  currentUser.user = user("a@example.com");
  await mount();
  expect(buttonsNamed("绑定邮箱")).toHaveLength(0);
  expect(buttonsNamed("修改密码")).toHaveLength(1);
});

test("用户资料未返回时不显示绑定入口", async (): Promise<void> => {
  currentUser.user = null;
  await mount();
  expect(buttonsNamed("绑定邮箱")).toHaveLength(0);
  expect(buttonsNamed("修改密码")).toHaveLength(1);
});

test("提交绑定邮箱时验证码转成大写且不清除登录凭证", async (): Promise<void> => {
  currentUser.user = user(null);
  await mount();
  await click(buttonsNamed("绑定邮箱")[0]);
  expect(document.querySelector("[data-slot='dialog-title']")?.textContent).toBe("绑定邮箱");

  const dialog = document.querySelector("[data-slot='dialog-content']");
  if (!(dialog instanceof HTMLElement)) throw new Error("缺少绑定邮箱对话框");
  const email = dialog.querySelector("#bind-email");
  const code = dialog.querySelector("#bind-code");
  if (!(email instanceof HTMLInputElement) || !(code instanceof HTMLInputElement)) {
    throw new Error("缺少邮箱或验证码输入框");
  }
  await typeInto(email, "bind@example.com");
  await typeInto(code, "a1b2c3");
  const submit = buttonsNamed("绑定邮箱", dialog).at(-1);
  if (!submit) throw new Error("缺少绑定提交按钮");
  await click(submit);

  await vi.waitFor(() => {
    expect(bindEmail).toHaveBeenCalledWith({ email: "bind@example.com", code: "A1B2C3" });
  });
  expect(localStorage.getItem("token")).toBe(TOKEN);
});

function LocationProbe(): React.ReactElement {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

let inboxRows: NotificationVO[];
let serve: (url: URL, options: RequestInit) => Promise<Response>;
const send = vi.fn<(input: string, options?: RequestInit) => Promise<Response>>();
const notifyError = vi.fn();

function json(data: unknown, code: number = 0): Response {
  return new Response(JSON.stringify({ code, data, msg: code ? "请求失败" : "成功" }), {
    status: 200,
  });
}

function makeRows(count: number): NotificationVO[] {
  return Array.from({ length: count }, (_, index): NotificationVO => {
    const record = {
      id: String(9000000000000000000n - BigInt(index)),
      sourceId: String(index + 1),
      createdAt: "2026-10-22 12:00:00",
      readAt: null,
      thumbnailUrl: `https://image.example/${index + 1}.webp`,
    };
    const source = {
      projectId: "11",
      projectTitle: "企划名称",
      itemId: "22",
      itemTitle: `项目名称 ${index + 1}`,
    };
    return index % 2
      ? { ...record, kind: "ITEM_COMPLETED", source: { ...source, taskSlot: null } }
      : {
          ...record,
          kind: "TASK_READY",
          source: {
            ...source,
            taskSlot: { name: "翻译", slotIndex: 2, slotTotal: 3, serialStep: 2 },
          },
        };
  });
}

async function defaultServe(url: URL, options: RequestInit): Promise<Response> {
  if (url.pathname === "/app/notifications/status")
    return json({ hasUnread: inboxRows.some((row) => row.readAt === null) });
  if (options.method === "PUT") {
    const readAt = "2026-10-22 13:00:00";
    if (url.pathname.endsWith("read-all")) {
      inboxRows = inboxRows.map((row) => ({ ...row, readAt: row.readAt ?? readAt }));
      return json({ readAt });
    }
    const id = url.pathname.split("/").at(-2)!;
    inboxRows = inboxRows.map((row) =>
      row.id === id ? { ...row, readAt: row.readAt ?? readAt } : row,
    );
    return json({ id, readAt });
  }
  const cursor = url.searchParams.get("beforeId");
  const start = cursor ? inboxRows.findIndex((row) => row.id === cursor) + 1 : 0;
  return json({
    list: inboxRows.slice(start, start + 20),
    hasNext: start + 20 < inboxRows.length,
    unreadCount: inboxRows.filter((row) => row.readAt === null).length,
  });
}

function requests(path: string, method: string = "GET"): number {
  return send.mock.calls.filter(
    ([url, options]) =>
      new URL(url, window.location.origin).pathname === path &&
      (options?.method ?? "GET") === method,
  ).length;
}

function bell(): HTMLButtonElement {
  const button = document.querySelector("button[aria-label^='通知']");
  if (!(button instanceof HTMLButtonElement)) throw new Error("缺少通知按钮");
  return button;
}

function rowButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("[role='dialog'] li button"));
}

function named(name: string): HTMLButtonElement {
  const button = buttonsNamed(name)[0];
  if (!button) throw new Error(`缺少按钮 ${name}`);
  return button;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete): void => {
    resolve = complete;
  });
  return { promise, resolve };
}

async function enableInbox(): Promise<void> {
  await act(async () => saveCurrentOrganization("1"));
  await mount();
  await vi.waitFor(() => expect(requests("/app/notifications/status")).toBe(1));
}

async function openInbox(expected: number = 20): Promise<void> {
  await click(bell());
  await vi.waitFor(() => expect(rowButtons()).toHaveLength(expected));
}

test("进站只检查状态，子路由重挂聚焦重连换发 token 不读取列表", async (): Promise<void> => {
  await enableInbox();
  expect(requests("/app/notifications")).toBe(0);
  const link = container.querySelector<HTMLAnchorElement>("a[href='/dashboard/workshop']")!;
  await act(async () => link.click());
  await mount(1);
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    saveRotatedCredentials("rotated-token", "refresh");
  });
  expect(requests("/app/notifications/status")).toBe(1);
  expect(requests("/app/notifications")).toBe(0);
  expect(bell().getAttribute("aria-label")).toBe("通知，有未读通知");
});

test("点击追加 5 条，重开仅取一次新首批，不重拉旧页", async (): Promise<void> => {
  await enableInbox();
  await openInbox();
  expect(requests("/app/notifications")).toBe(1);
  expect(document.querySelectorAll("[role='dialog'] img")).toHaveLength(20);
  await click(named("加载更多"));
  await vi.waitFor(() => expect(rowButtons()).toHaveLength(25));
  const pageCalls = send.mock.calls.filter(
    ([url]) => new URL(url, window.location.origin).pathname === "/app/notifications",
  );
  expect(new URL(pageCalls[1][0], window.location.origin).searchParams.get("beforeId")).toBe(
    inboxRows[19].id,
  );
  await click(bell());
  expect(requests("/app/notifications")).toBe(2);
  await openInbox();
  expect(requests("/app/notifications")).toBe(3);
  expect(new URL(send.mock.calls.at(-1)![0], window.location.origin).search).toBe("");
  expect(requests("/app/notifications/status")).toBe(1);
});

test("较新的已读通知排在未读后面，标已读后立即后移", async (): Promise<void> => {
  inboxRows = makeRows(3).map((row, index) => ({
    ...row,
    source: null,
    thumbnailUrl: null,
    id: String(3 - index),
    createdAt: ["2026-10-22 13:00:00", "2026-10-22 12:00:00", "2026-10-22 09:00:00"][index],
    readAt: index === 0 ? "2026-10-22 13:10:00" : null,
  }));
  await enableInbox();
  await openInbox(3);
  expect(rowButtons().map((button) => button.textContent?.includes("未读"))).toEqual([
    true,
    true,
    false,
  ]);
  await click(rowButtons()[0]);
  await vi.waitFor(() =>
    expect(rowButtons().filter((button) => button.textContent?.includes("未读"))).toHaveLength(1),
  );
  expect(rowButtons()[0].textContent).toContain("未读");
  expect(requests("/app/notifications")).toBe(1);
});

test("铃铛外部点击 Escape 关闭，Escape 归还焦点", async (): Promise<void> => {
  await enableInbox();
  await openInbox();
  await click(bell());
  expect(document.querySelector("[role='dialog']")).toBeNull();
  await openInbox();
  await act(async () =>
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })),
  );
  expect(document.querySelector("[role='dialog']")).toBeNull();
  await openInbox();
  await act(async () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  expect(document.querySelector("[role='dialog']")).toBeNull();
  expect(document.activeElement).toBe(bell());
  expect(requests("/app/notifications/status")).toBe(1);
});

test("状态失败不妨碍打开，首批失败显式重试且不伪装为空", async (): Promise<void> => {
  let failed = true;
  serve = async (url, options): Promise<Response> =>
    failed ? json(null, 5) : defaultServe(url, options);
  await enableInbox();
  await vi.waitFor(() => expect(bell().getAttribute("aria-label")).toContain("暂不可用"));
  await click(bell());
  await vi.waitFor(() => expect(document.body.textContent).toContain("通知加载失败"));
  expect(document.body.textContent).not.toContain("暂无通知");
  failed = false;
  await click(named("重试"));
  await vi.waitFor(() => expect(rowButtons()).toHaveLength(20));
  expect(bell().getAttribute("aria-label")).toBe("通知，有未读通知");
  expect(requests("/app/notifications/status")).toBe(1);
});

test("下一页失败保留首批，仅手动重试下一页", async (): Promise<void> => {
  let failed = true;
  serve = async (url, options): Promise<Response> =>
    url.searchParams.has("beforeId") && failed ? json(null, 5) : defaultServe(url, options);
  await enableInbox();
  await openInbox();
  await click(named("加载更多"));
  await vi.waitFor(() => expect(document.body.textContent).toContain("加载失败，重试"));
  expect(rowButtons()).toHaveLength(20);
  failed = false;
  await click(named("加载失败，重试"));
  await vi.waitFor(() => expect(rowButtons()).toHaveLength(25));
  expect(requests("/app/notifications")).toBe(3);
});

test("延迟初始化状态不能覆盖列表和全部已读结果", async (): Promise<void> => {
  const initial = deferred<Response>();
  serve = (url, options): Promise<Response> =>
    url.pathname.endsWith("/status") ? initial.promise : defaultServe(url, options);
  await enableInbox();
  await openInbox();
  await click(named("全部已读"));
  await vi.waitFor(() => expect(bell().getAttribute("aria-label")).toBe("通知"));
  await act(async () => initial.resolve(json({ hasUnread: true })));
  expect(bell().getAttribute("aria-label")).toBe("通知");
  expect(rowButtons().every((button) => !button.textContent?.includes("未读"))).toBe(true);
  expect(client.getQueryData(scopedKey(["notificationStatus"], "org"))).toEqual({
    hasUnread: false,
  });
  expect(requests("/app/notifications/status")).toBe(1);
  expect(requests("/app/notifications")).toBe(1);
});

test("旧 false 状态不能回退列表建立的红点", async (): Promise<void> => {
  const initial = deferred<Response>();
  serve = (url, options): Promise<Response> =>
    url.pathname.endsWith("/status") ? initial.promise : defaultServe(url, options);
  await enableInbox();
  await openInbox();
  await act(async () => initial.resolve(json({ hasUnread: false })));
  expect(bell().getAttribute("aria-label")).toBe("通知，有未读通知");
});

test("已读失败不改 UI 或导航，成功先更新缓存再导航", async (): Promise<void> => {
  inboxRows = makeRows(1);
  let failed = true;
  serve = (url, options): Promise<Response> =>
    options.method === "PUT" && failed
      ? Promise.resolve(json(null, 5))
      : defaultServe(url, options);
  await enableInbox();
  await openInbox(1);
  await click(rowButtons()[0]);
  await vi.waitFor(() => expect(notifyError).toHaveBeenCalled());
  expect(rowButtons()[0].textContent).toContain("未读");
  expect(document.querySelector("[data-testid='location']")?.textContent).toBe(
    "/dashboard/planning",
  );
  failed = false;
  await click(rowButtons()[0]);
  await vi.waitFor(() =>
    expect(document.querySelector("[data-testid='location']")?.textContent).toBe(
      "/dashboard/planning/11/items/22?taskInstanceId=1",
    ),
  );
  expect(document.querySelector("[role='dialog']")).toBeNull();
  expect(bell().getAttribute("aria-label")).toBe("通知");
  expect(requests("/app/notifications")).toBe(1);
});

test.each(["TASK_READY", "ITEM_COMPLETED"] as const)(
  "来源失效的 %s 仅标已读并保留列表",
  async (kind): Promise<void> => {
    inboxRows = [{ ...makeRows(1)[0], kind, source: null, thumbnailUrl: null }];
    await enableInbox();
    await openInbox(1);
    await click(rowButtons()[0]);
    await vi.waitFor(() => expect(rowButtons()[0].textContent).not.toContain("未读"));
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
    expect(document.querySelector("[data-testid='location']")?.textContent).toBe(
      "/dashboard/planning",
    );
    await vi.waitFor(() => expect(bell().getAttribute("aria-label")).toBe("通知"));
    await click(rowButtons()[0]);
    expect(requests(`/app/notifications/${inboxRows[0].id}/read`, "PUT")).toBe(1);
  },
);

test("分页和已读共享互斥保护，不会被旧分页覆盖", async (): Promise<void> => {
  const page = deferred<Response>();
  const write = deferred<Response>();
  serve = (url, options): Promise<Response> =>
    options.method === "PUT"
      ? write.promise
      : url.searchParams.has("beforeId")
        ? page.promise
        : defaultServe(url, options);
  await enableInbox();
  await openInbox();
  await click(named("加载更多"));
  expect(named("全部已读").disabled).toBe(true);
  expect(rowButtons()[0].disabled).toBe(true);
  await act(async () =>
    page.resolve(json({ list: inboxRows.slice(20), hasNext: false, unreadCount: 25 })),
  );
  await vi.waitFor(() => expect(rowButtons()).toHaveLength(25));
  await click(named("全部已读"));
  expect(rowButtons().every((button) => button.disabled)).toBe(true);
  await act(async () => write.resolve(json({ readAt: "2026-10-22 13:00:00" })));
  await vi.waitFor(() => expect(bell().getAttribute("aria-label")).toBe("通知"));
});

test("关闭取消列表，快速重开不复用旧响应或图片", async (): Promise<void> => {
  const old = deferred<Response>();
  let first = true;
  serve = (url, options): Promise<Response> => {
    if (url.pathname === "/app/notifications" && first) {
      first = false;
      return old.promise;
    }
    return defaultServe(url, options);
  };
  await enableInbox();
  await click(bell());
  await vi.waitFor(() => expect(requests("/app/notifications")).toBe(1));
  const signal = send.mock.calls.find(
    ([url]) => new URL(url, window.location.origin).pathname === "/app/notifications",
  )![1]!.signal!;
  await click(bell());
  expect(signal.aborted).toBe(true);
  inboxRows = makeRows(1);
  inboxRows[0].thumbnailUrl = "https://image.example/new.webp";
  await openInbox(1);
  await act(async () => old.resolve(json({ list: makeRows(20), hasNext: true, unreadCount: 25 })));
  expect(rowButtons()).toHaveLength(1);
  expect(document.querySelector("[role='dialog'] img")?.getAttribute("src")).toBe(
    "https://image.example/new.webp",
  );
});

test("切身份立即关闭，仅查询新状态，旧已读结果不污染或导航", async (): Promise<void> => {
  const write = deferred<Response>();
  inboxRows = makeRows(1);
  serve = (url, options): Promise<Response> =>
    options.method === "PUT" ? write.promise : defaultServe(url, options);
  await enableInbox();
  await openInbox(1);
  await click(rowButtons()[0]);
  await act(async () => saveSession({ token: "new-user", userId: "2", defaultOrgId: "2" }));
  expect(document.querySelector("[role='dialog']")).toBeNull();
  await vi.waitFor(() => expect(requests("/app/notifications/status")).toBe(2));
  await act(async () =>
    write.resolve(json({ id: inboxRows[0].id, readAt: "2026-10-22 13:00:00" })),
  );
  expect(requests("/app/notifications")).toBe(1);
  expect(
    client.getQueryData(scopedKey(["notificationStatus"], "org", getSessionSnapshot())),
  ).toEqual({ hasUnread: true });
  expect(document.querySelector("[data-testid='location']")?.textContent).toBe(
    "/dashboard/planning",
  );
});

test("无组织打开只有选择组织提示，没有任一通知请求", async (): Promise<void> => {
  await mount();
  await click(bell());
  expect(document.body.textContent).toContain("请选择组织后查看通知");
  expect(requests("/app/notifications/status")).toBe(0);
  expect(requests("/app/notifications")).toBe(0);
});

test("面板关闭后已成功完成的已读仍更新当前身份红点", async (): Promise<void> => {
  const write = deferred<Response>();
  inboxRows = makeRows(1);
  serve = (url, options): Promise<Response> =>
    options.method === "PUT" ? write.promise : defaultServe(url, options);
  await enableInbox();
  await openInbox(1);
  await click(rowButtons()[0]);
  await click(bell());
  expect(document.querySelector("[role='dialog']")).toBeNull();
  await act(async () =>
    write.resolve(json({ id: inboxRows[0].id, readAt: "2026-10-22 13:00:00" })),
  );
  await vi.waitFor(() => expect(bell().getAttribute("aria-label")).toBe("通知"));
  expect(requests("/app/notifications")).toBe(1);
});

test("组织切换关闭面板，旧列表响应不能更新新组织状态", async (): Promise<void> => {
  const old = deferred<Response>();
  serve = (url, options): Promise<Response> =>
    url.pathname === "/app/notifications" ? old.promise : defaultServe(url, options);
  await enableInbox();
  await click(bell());
  await vi.waitFor(() => expect(requests("/app/notifications")).toBe(1));
  await act(async () => saveCurrentOrganization("2"));
  expect(document.querySelector("[role='dialog']")).toBeNull();
  await vi.waitFor(() => expect(requests("/app/notifications/status")).toBe(2));
  await act(async () => old.resolve(json({ list: [], hasNext: false, unreadCount: 0 })));
  expect(client.getQueryData(scopedKey(["notificationStatus"], "org"))).toEqual({
    hasUnread: true,
  });
  expect(requests("/app/notifications")).toBe(1);
});

test("已读期间禁用仍可继续分页的按钮，首批计数与状态一起减少", async (): Promise<void> => {
  const write = deferred<Response>();
  inboxRows[0] = { ...inboxRows[0], source: null, thumbnailUrl: null };
  serve = (url, options): Promise<Response> =>
    options.method === "PUT" ? write.promise : defaultServe(url, options);
  await enableInbox();
  await openInbox();
  await click(rowButtons()[0]);
  expect(named("加载更多").disabled).toBe(true);
  expect(named("全部已读").disabled).toBe(true);
  await act(async () =>
    write.resolve(json({ id: inboxRows[0].id, readAt: "2026-10-22 13:00:00" })),
  );
  await vi.waitFor(() =>
    expect(rowButtons().at(-1)?.textContent).toContain("通知关联内容已不可访问"),
  );
  expect(rowButtons().at(-1)?.textContent).not.toContain("未读");
  expect(rowButtons()[0].textContent).toContain("未读");
  const data = client.getQueryData<{ pages: { unreadCount: number }[] }>(
    scopedKey(["notifications"], "org"),
  );
  expect(data?.pages[0].unreadCount).toBe(24);
  expect(client.getQueryData(scopedKey(["notificationStatus"], "org"))).toEqual({
    hasUnread: true,
  });
  expect(requests("/app/notifications")).toBe(1);
});

test("项目完成通知由基础来源数据生成项目路由", async (): Promise<void> => {
  inboxRows = [makeRows(2)[1]];
  await enableInbox();
  await openInbox(1);
  expect(rowButtons()[0].textContent).toContain("企划名称");
  expect(rowButtons()[0].textContent).toContain("项目名称 2");
  await click(rowButtons()[0]);
  await vi.waitFor(() =>
    expect(document.querySelector("[data-testid='location']")?.textContent).toBe(
      "/dashboard/planning/11/items/22",
    ),
  );
  expect(document.querySelector("[role='dialog']")).toBeNull();
});
