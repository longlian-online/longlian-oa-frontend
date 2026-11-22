// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { clearSession, saveSession } from "@/lib/session";
import OpenApiKeySettings from "./OpenApiKeySettings";

interface Group {
  orgId: number;
  orgName: string;
  maxKeys: number;
  keys: { id: number; name: string; createdAt: string; lastUsedAt: string | null }[];
}

const { tip } = vi.hoisted(() => ({ tip: vi.fn() }));
vi.mock("@/components/tip", () => ({ $tip: tip }));

const groups: Group[] = [
  {
    orgId: 1,
    orgName: "甲组",
    maxKeys: 2,
    keys: [{ id: 11, name: "旧密钥", createdAt: "2026-01-02 03:04:05", lastUsedAt: null }],
  },
  { orgId: 2, orgName: "乙组", maxKeys: 2, keys: [] },
];

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let writeText: (text: string) => Promise<void>;
let revokedId: number | null;
let createFailed: boolean;

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "session-token", userId: "1", defaultOrgId: "1" });
  groups[0].keys = [{ id: 11, name: "旧密钥", createdAt: "2026-01-02 03:04:05", lastUsedAt: null }];
  revokedId = null;
  createFailed = false;
  tip.mockReset();
  writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input, "http://localhost");
    if (url.pathname === "/app/openapi-keys" && init?.method === "POST") {
      if (createFailed) return json(null, 3, "超出上限");
      return json({ id: 21, key: "oa_plain_secret" }, 0);
    }
    if (url.pathname.startsWith("/app/openapi-keys/") && init?.method === "DELETE") {
      revokedId = Number(url.pathname.split("/").pop());
      return json(null, 0);
    }
    const visible = groups.map((group) => ({
      ...group,
      keys: group.keys.filter((entry) => entry.id !== revokedId),
    }));
    return json(visible, 0);
  });
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
  vi.unstubAllGlobals();
});

function json(data: unknown, code = 0, msg = "成功"): Response {
  return new Response(JSON.stringify({ code, msg, data }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function mount(orgId = "1"): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <OpenApiKeySettings orgId={orgId} />
        </ConfirmDialogProvider>
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

test("跟随页签组织渲染密钥，创建入口收敛为按钮", async (): Promise<void> => {
  await mount("1");
  await vi.waitFor(() => {
    expect(document.body.textContent).toContain("旧密钥");
  });
  expect(document.body.textContent).toContain("已用 1/2");
  expect(document.body.textContent).not.toContain("乙组");
  // 元数据分行，不再用 · 连接
  expect(document.body.textContent).not.toMatch(/创建时间.*·.*最近使用/s);
  expect(document.body.textContent).toContain("创建时间");
  expect(document.body.textContent).toContain("从未使用");
  // 创建表单不常驻，收在按钮后
  expect(document.querySelector("#openapi-key-name")).toBeNull();
  expect(buttonsNamed("新建密钥")).toHaveLength(1);
});

test("达到上限时新建按钮禁用并提示先吊销", async (): Promise<void> => {
  groups[0].keys = [
    ...groups[0].keys,
    { id: 12, name: "第二个", createdAt: "2026-02-03 04:05:06", lastUsedAt: null },
  ];
  await mount("1");
  await vi.waitFor(() => {
    expect(document.body.textContent).toContain("已用 2/2");
  });
  const create = buttonsNamed("新建密钥")[0];
  expect(create?.disabled).toBe(true);
  expect(create?.title).toContain("已达上限");
  // 空态不出现
  expect(document.body.textContent).not.toContain("还没有密钥");
});

test("空组织显示空态", async (): Promise<void> => {
  await mount("2");
  await vi.waitFor(() => {
    expect(document.body.textContent).toContain("还没有密钥，点击上方按钮新建");
  });
  expect(document.body.textContent).toContain("已用 0/2");
  expect(document.body.textContent).not.toContain("旧密钥");
});

test("非当前组织的页签只读：创建吊销禁用并提示", async (): Promise<void> => {
  // 会话在甲组，页签切到乙组：只读
  saveSession({ token: "session-token", userId: "1", defaultOrgId: "2" });
  await mount("1");
  await vi.waitFor(() => {
    expect(document.body.textContent).toContain("旧密钥");
  });
  expect(document.body.textContent).toContain("创建或吊销需先在页头切换到该组织");
  const create = buttonsNamed("新建密钥")[0];
  expect(create?.disabled).toBe(true);
  const rowButton = buttonsNamed("吊销").find((button) =>
    button.closest("li")?.textContent?.includes("旧密钥"),
  );
  expect(rowButton?.disabled).toBe(true);
});

test("新建按钮打开弹窗，成功后原位切换为一次性展示", async (): Promise<void> => {
  await mount("1");
  await vi.waitFor(() => {
    expect(buttonsNamed("新建密钥").length).toBe(1);
  });
  await click(buttonsNamed("新建密钥")[0]);
  await vi.waitFor(() => {
    expect(document.querySelector("[role='dialog']")?.textContent).toContain("新建 OpenAPI 密钥");
  });
  const input = document.querySelector("#openapi-key-name");
  if (!(input instanceof HTMLInputElement)) throw new Error("缺少名称输入框");
  await typeInto(input, "翻译机器人");
  await click(buttonsNamed("创建", document.querySelector("[role='dialog']") as ParentNode)[0]);
  await vi.waitFor(() => {
    expect(document.querySelector("[role='dialog']")?.textContent).toContain("密钥已创建");
  });
  expect(document.querySelector("[role='dialog']")?.textContent).toContain("oa_plain_secret");
  expect(document.querySelector("[role='dialog']")?.textContent).toContain("仅展示这一次");
  const copy = buttonsNamed("复制", document.querySelector("[role='dialog']") as ParentNode)[0];
  await click(copy);
  expect(writeText).toHaveBeenCalledWith("oa_plain_secret");
  expect(tip).toHaveBeenCalledWith("已复制到剪贴板", "success");
  await click(buttonsNamed("完成", document.querySelector("[role='dialog']") as ParentNode)[0]);
  await vi.waitFor(() => {
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });
  expect(document.body.textContent).not.toContain("oa_plain_secret");
});

test("创建失败提示错误且弹窗停在表单态", async (): Promise<void> => {
  createFailed = true;
  await mount("1");
  await vi.waitFor(() => {
    expect(buttonsNamed("新建密钥").length).toBe(1);
  });
  await click(buttonsNamed("新建密钥")[0]);
  await vi.waitFor(() => {
    expect(document.querySelector("#openapi-key-name") instanceof HTMLInputElement).toBe(true);
  });
  const input = document.querySelector("#openapi-key-name") as HTMLInputElement;
  await typeInto(input, "超限密钥");
  await click(buttonsNamed("创建", document.querySelector("[role='dialog']") as ParentNode)[0]);
  await vi.waitFor(() => {
    expect(tip).toHaveBeenCalledWith("超出上限", "error");
  });
  expect(document.querySelector("[role='dialog']")?.textContent).toContain("新建 OpenAPI 密钥");
  expect(document.body.textContent).not.toContain("oa_plain_secret");
});

test("弹窗内名称校验：空白和超长停在字段旁且不发请求", async (): Promise<void> => {
  await mount("1");
  await vi.waitFor(() => {
    expect(buttonsNamed("新建密钥").length).toBe(1);
  });
  await click(buttonsNamed("新建密钥")[0]);
  await vi.waitFor(() => {
    expect(document.querySelector("#openapi-key-name") instanceof HTMLInputElement).toBe(true);
  });
  const input = document.querySelector("#openapi-key-name") as HTMLInputElement;
  await click(buttonsNamed("创建", document.querySelector("[role='dialog']") as ParentNode)[0]);
  expect(document.querySelector("#openapi-key-name-error")?.textContent).toBe("名称不能为空");
  await typeInto(input, "名".repeat(51));
  await click(buttonsNamed("创建", document.querySelector("[role='dialog']") as ParentNode)[0]);
  expect(document.querySelector("#openapi-key-name-error")?.textContent).toBe("名称最多 50 个字符");
  expect(tip).not.toHaveBeenCalled();
});

test("吊销需确认且确认后从列表移除", async (): Promise<void> => {
  await mount("1");
  await vi.waitFor(() => {
    expect(document.body.textContent).toContain("旧密钥");
  });
  const rowButton = buttonsNamed("吊销").find((button) =>
    button.closest("li")?.textContent?.includes("旧密钥"),
  );
  if (!rowButton) throw new Error("缺少吊销按钮");
  await click(rowButton);
  await vi.waitFor(() => {
    expect(document.querySelector("[role='dialog']")?.textContent).toContain("吊销密钥");
  });
  expect(revokedId).toBeNull();
  const confirm = buttonsNamed("吊销", document.querySelector("[role='dialog']") as ParentNode)[0];
  if (!confirm) throw new Error("缺少确认按钮");
  await click(confirm);
  await vi.waitFor(() => {
    expect(revokedId).toBe(11);
  });
  await vi.waitFor(() => {
    expect(document.body.textContent).not.toContain("旧密钥");
  });
  // 唯一密钥被吊销后回到空态
  expect(document.body.textContent).toContain("已用 0/2");
  expect(document.body.textContent).toContain("还没有密钥，点击上方按钮新建");
});
