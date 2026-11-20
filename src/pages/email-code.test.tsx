// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ApiError } from "@/api/apiError";
import { notificationService } from "@/services/notification";
import LoginPage from "./login";
import ForgotPasswordPage from "./forgot-password";

const { sendVerificationCode, tip, notify } = vi.hoisted(() => ({
  sendVerificationCode: vi.fn(),
  tip: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("@/api/auth", () => ({
  sendVerificationCode,
  loginByPassword: vi.fn(),
  loginByCode: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock("@/components/tip", () => ({ $tip: tip }));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  sendVerificationCode.mockReset();
  tip.mockReset();
  notify.mockReset();
  vi.spyOn(notificationService, "notify").mockImplementation(notify);
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openPage(page: string): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>{page === "LOGIN" ? <LoginPage /> : <ForgotPasswordPage />}</MemoryRouter>
      </QueryClientProvider>,
    );
  });
  if (page === "LOGIN") {
    const tab = Array.from(container.querySelectorAll<HTMLButtonElement>("[role=tab]")).find(
      (element) => element.textContent === "邮箱",
    )!;
    await act(async () => tab.click());
  }
}

async function setEmail(email: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>("#email")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, email);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function sendButton(): HTMLButtonElement {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    ["发送", "发送验证码", "重新发送"].includes(button.textContent ?? ""),
  )!;
}

test.each(["LOGIN", "FORGOT_PASSWORD"])(
  "%s reports an unregistered email once through the popup without inline feedback or a success state",
  async (page) => {
    sendVerificationCode.mockRejectedValue(new ApiError("该邮箱尚未注册，请先注册", true, 7));
    await openPage(page);
    await setEmail("new@example.com");
    await act(async () => sendButton().click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));

    expect(sendVerificationCode).toHaveBeenCalledWith({
      email: "new@example.com",
      businessType: page,
    });
    expect(notify).toHaveBeenCalledExactlyOnceWith({
      type: "error",
      message: "该邮箱尚未注册，请先注册",
    });
    expect(container.querySelector("[role=alert]")).toBeNull();
    expect(container.textContent).not.toContain("该邮箱尚未注册");
    expect(sendButton().disabled).toBe(false);
    expect(tip).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("验证码已发送至邮箱");

    await setEmail("existing@example.com");
    expect(container.querySelector("[role=alert]")).toBeNull();
  },
);

test.each(["LOGIN", "FORGOT_PASSWORD"])(
  "%s does not suggest registration for rate limits",
  async (page) => {
    sendVerificationCode.mockRejectedValue(new ApiError("发送验证码过于频繁", false, 1));
    await openPage(page);
    await setEmail("existing@example.com");
    await act(async () => sendButton().click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    expect(container.querySelector("[role=alert]")).toBeNull();
    expect(tip).not.toHaveBeenCalled();
    expect(sendButton().disabled).toBe(false);
  },
);

test("forgot password preserves the previous sent state when the email changes or resending fails", async () => {
  sendVerificationCode.mockResolvedValueOnce(undefined);
  await openPage("FORGOT_PASSWORD");
  await setEmail("existing@example.com");
  await act(async () => sendButton().click());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  expect(sendButton().textContent).toBe("重新发送");
  expect(tip).toHaveBeenCalledWith("验证码已发送", "success");

  await setEmail("new@example.com");
  expect(sendButton().textContent).toBe("重新发送");
  sendVerificationCode.mockRejectedValueOnce(new ApiError("该邮箱尚未注册，请先注册", false, 7));
  await act(async () => sendButton().click());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  expect(container.querySelector("[role=alert]")).toBeNull();
  expect(sendButton().textContent).toBe("重新发送");
});
