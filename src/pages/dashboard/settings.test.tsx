// @vitest-environment happy-dom
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import PersonalSettingsPage from "@/pages/dashboard/settings";
import { createQueryClient } from "@/lib/queryClient";
import { clearSession, saveSession } from "@/lib/session";
import type { UserInfoVO } from "@/types/user";

const { bindEmail, changePassword, getUserConfig, patchUserConfig, updateMyInfo, currentUser } =
  vi.hoisted(() => ({
    bindEmail: vi.fn(async () => undefined),
    changePassword: vi.fn(async () => undefined),
    getUserConfig: vi.fn(async () => ({ config: {} })),
    patchUserConfig: vi.fn(async () => undefined),
    updateMyInfo: vi.fn(async () => undefined),
    currentUser: {
      user: null as UserInfoVO | null,
      isLoading: false,
    },
  }));

vi.mock("@/api/user", () => ({
  bindEmail,
  changePassword,
  getUserConfig,
  patchUserConfig,
  updateMyInfo,
}));

vi.mock("@/api/auth", () => ({
  sendVerificationCode: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: currentUser.user,
    role: null,
    isLoading: currentUser.isLoading,
    isAuthenticated: currentUser.user !== null,
    error: null,
    refresh: async () => undefined,
  }),
}));

vi.mock("@/hooks/useUploadFile", () => ({
  useUploadFile: () => ({ uploading: false, uploadFile: async () => ({ fileId: "9" }) }),
}));

const TOKEN = "session-token";
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;

function user(email: string | null): UserInfoVO {
  return { id: "1", username: "legacy", nickname: "遗留用户", email };
}

function LocationProbe(): React.ReactElement {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  currentUser.user = user(null);
  currentUser.isLoading = false;
  bindEmail.mockReset();
  bindEmail.mockResolvedValue(undefined);
  changePassword.mockReset();
  changePassword.mockResolvedValue(undefined);
  getUserConfig.mockReset();
  getUserConfig.mockResolvedValue({ config: {} });
  patchUserConfig.mockReset();
  patchUserConfig.mockResolvedValue(undefined);
  updateMyInfo.mockReset();
  updateMyInfo.mockResolvedValue(undefined);
  saveSession({ token: TOKEN, userId: "1" });
  client = createQueryClient();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach((): void => {
  act(() => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  vi.unstubAllGlobals();
});

async function mount(): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/dashboard/settings"]}>
          <PersonalSettingsPage />
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

test("修改昵称时空白和超长停在字段旁", async (): Promise<void> => {
  currentUser.user = user("a@example.com");
  await mount();
  const nickname = document.querySelector("#nickname");
  if (!(nickname instanceof HTMLInputElement)) throw new Error("缺少昵称输入框");
  expect(nickname.value).toBe("遗留用户");
  expect(document.body.textContent).toContain("登录名 legacy");
  expect(document.querySelector("#bind-email")).toBeNull();

  const submit = buttonsNamed("保存")[0];
  if (!submit) throw new Error("缺少保存按钮");
  await typeInto(nickname, "   ");
  await click(submit);
  expect(document.querySelector("#nickname-error")?.textContent).toBe("昵称不能为空");
  expect(updateMyInfo).not.toHaveBeenCalled();

  await typeInto(nickname, "名".repeat(21));
  await click(submit);
  expect(document.querySelector("#nickname-error")?.textContent).toBe("昵称最多20个字符");

  await typeInto(nickname, "  新昵称  ");
  await click(submit);
  await vi.waitFor(() => {
    expect(updateMyInfo).toHaveBeenCalledWith({ nickname: "新昵称" });
  });
});

test("未绑定邮箱时提交验证码会转成大写且不清除登录凭证", async (): Promise<void> => {
  currentUser.user = user(null);
  await mount();
  const email = document.querySelector("#bind-email");
  const code = document.querySelector("#bind-code");
  if (!(email instanceof HTMLInputElement) || !(code instanceof HTMLInputElement)) {
    throw new Error("缺少邮箱或验证码输入框");
  }
  await typeInto(email, "bind@example.com");
  await typeInto(code, "a1b2c3");
  const submit = buttonsNamed("绑定邮箱")[0];
  if (!submit) throw new Error("缺少绑定提交按钮");
  await click(submit);
  await vi.waitFor(() => {
    expect(bindEmail).toHaveBeenCalledWith({ email: "bind@example.com", code: "A1B2C3" });
  });
  expect(localStorage.getItem("token")).toBe(TOKEN);
});

test("修改密码成功后清除当前登录并回到登录页", async (): Promise<void> => {
  currentUser.user = user("a@example.com");
  await mount();
  const oldPassword = document.querySelector("#old-password");
  const newPassword = document.querySelector("#new-password");
  if (!(oldPassword instanceof HTMLInputElement) || !(newPassword instanceof HTMLInputElement)) {
    throw new Error("缺少密码输入框");
  }
  await typeInto(oldPassword, "Oldpass1");
  await typeInto(newPassword, "Newpass1");
  const submit = buttonsNamed("修改密码")[0];
  if (!submit) throw new Error("缺少修改密码按钮");
  await click(submit);
  await vi.waitFor(() => {
    expect(changePassword).toHaveBeenCalledWith({
      oldPassword: "Oldpass1",
      newPassword: "Newpass1",
    });
  });
  expect(localStorage.getItem("token")).toBeNull();
  expect(document.querySelector("[data-testid='location']")?.textContent).toBe("/login");
});

test("关闭某一类型通知时只提交该类型", async (): Promise<void> => {
  currentUser.user = user("a@example.com");
  await mount();
  await vi.waitFor(() => {
    expect(document.querySelectorAll("[role='switch']").length).toBe(6);
  });
  const kind = document.querySelector("[aria-labelledby='TASK_READY-label']");
  if (!(kind instanceof HTMLElement)) throw new Error("缺少可以开始开关");
  await act(async () => {
    kind.click();
  });
  await vi.waitFor(() => {
    expect(patchUserConfig).toHaveBeenCalledWith({
      config: { notificationKinds: { TASK_READY: false } },
    });
  });
});
