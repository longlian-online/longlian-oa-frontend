// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import AppHeader from "@/components/layout/AppHeader";
import { clearSession, saveSession } from "@/lib/session";
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
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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

async function mount(): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AppHeader switcher={switcher} onMore={() => undefined} />
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
