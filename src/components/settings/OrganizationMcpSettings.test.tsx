// @vitest-environment happy-dom
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import type { McpApiKeyInfo } from "@/api/mcpApiKey";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import OrganizationMcpSettings from "@/components/settings/OrganizationMcpSettings";
import { createQueryClient } from "@/lib/queryClient";
import { clearSession, saveSession } from "@/lib/session";

const { getMcpApiKey, generateMcpApiKey, revokeMcpApiKey, writeText } = vi.hoisted(() => ({
  getMcpApiKey: vi.fn<() => Promise<McpApiKeyInfo>>(),
  generateMcpApiKey: vi.fn(),
  revokeMcpApiKey: vi.fn(async () => undefined),
  writeText: vi.fn(async () => undefined),
}));

vi.mock("@/api/mcpApiKey", () => ({ getMcpApiKey, generateMcpApiKey, revokeMcpApiKey }));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const SECRET = "ll_mcp_abcdefghijklmnopqrstuvwxyz0123456789_ABCDEF";

function metadata(overrides: Partial<McpApiKeyInfo> = {}): McpApiKeyInfo {
  return {
    id: null,
    orgId: "11",
    state: "NOT_CREATED",
    prefix: null,
    generatedAt: null,
    revokedAt: null,
    suspendedReason: null,
    canGenerate: true,
    canRevoke: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  getMcpApiKey.mockResolvedValue(metadata());
  generateMcpApiKey.mockResolvedValue({
    id: "1",
    orgId: "11",
    apiKey: SECRET,
    prefix: SECRET.slice(0, 15),
    generatedAt: "2026-11-10 12:00:00",
    mcpUrl: "http://localhost:10003/mcp",
  });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  saveSession({ token: "session-token", userId: "1" });
  client = createQueryClient();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  vi.unstubAllGlobals();
});

async function mount(orgId = "11"): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <OrganizationMcpSettings key={orgId} orgId={orgId} orgName={`组织${orgId}`} />
        </ConfirmDialogProvider>
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function button(name: string, scope: ParentNode = document): HTMLButtonElement {
  const result = Array.from(scope.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.replace(/\s+/g, "") === name,
  );
  if (!result) throw new Error(`缺少按钮：${name}`);
  return result;
}

async function click(target: HTMLButtonElement): Promise<void> {
  await act(async () => {
    target.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

test("原文只在生成弹窗显示，复制后关闭清空，查询和 Mutation 缓存不保存原文", async () => {
  await mount();
  await click(button("生成APIKey"));
  expect(generateMcpApiKey).toHaveBeenCalledWith("11");
  expect(document.querySelector<HTMLInputElement>("#mcp-secret")?.value).toBe(SECRET);
  expect(document.querySelector<HTMLInputElement>("#mcp-endpoint")?.value).toBe(
    "http://localhost:10003/mcp",
  );
  expect(
    JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.state.data),
    ),
  ).not.toContain(SECRET);
  expect(
    JSON.stringify(
      client
        .getMutationCache()
        .getAll()
        .map((mutation) => mutation.state.data),
    ),
  ).not.toContain(SECRET);
  await click(button("复制Key"));
  expect(writeText).toHaveBeenCalledWith(SECRET);
  await click(button("完成"));
  expect(document.querySelector<HTMLInputElement>("#mcp-secret")?.value ?? "").toBe("");
});

test("切换个人设置中的组织时清除上一组织原文，后续生成使用选中的组织", async () => {
  await mount();
  await click(button("生成APIKey"));
  await mount("22");
  expect(document.querySelector<HTMLInputElement>("#mcp-secret")?.value ?? "").toBe("");
  await click(button("生成APIKey"));
  expect(generateMcpApiKey).toHaveBeenLastCalledWith("22");
});

test("重新生成需要确认，取消时不发请求", async () => {
  getMcpApiKey.mockResolvedValue(metadata({ state: "ACTIVE", canRevoke: true }));
  await mount();
  await click(button("重新生成APIKey"));
  expect(document.body.textContent).toContain("旧 Key 将立即作废");
  expect(generateMcpApiKey).not.toHaveBeenCalled();
  await click(button("取消"));
  expect(generateMcpApiKey).not.toHaveBeenCalled();
  await click(button("重新生成APIKey"));
  await click(button("重新生成"));
  expect(generateMcpApiKey).toHaveBeenCalledOnce();
});

test("暂停的 Key 不能重新生成，仍可确认撤销", async () => {
  getMcpApiKey.mockResolvedValue(
    metadata({
      state: "SUSPENDED",
      canGenerate: false,
      canRevoke: true,
      suspendedReason: "组织已被禁用",
    }),
  );
  await mount();
  expect(button("重新生成APIKey").disabled).toBe(true);
  expect(document.body.textContent).toContain("组织已被禁用");
  await click(button("撤销"));
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) throw new Error("缺少撤销确认框");
  expect(revokeMcpApiKey).not.toHaveBeenCalled();
  await click(button("撤销", dialog));
  expect(revokeMcpApiKey).toHaveBeenCalledWith("11");
});
