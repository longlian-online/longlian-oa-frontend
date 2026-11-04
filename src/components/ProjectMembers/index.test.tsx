// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import ProjectMembers from "@/components/ProjectMembers";
import { clearSession, saveCurrentOrganization, saveSession } from "@/lib/session";
import type { ProjectMemberVO } from "@/types/planning";

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const calls: { url: URL; orgId: string | null }[] = [];
let total: number;
let fail: boolean;

function json(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, data }));
}

function member(userId: string, isCreator = false): ProjectMemberVO {
  return { userId, nickname: `成员${userId}`, isCreator };
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  total = 13;
  fail = false;
  calls.length = 0;
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input, "http://localhost");
    calls.push({ url, orgId: new Headers(init?.headers).get("X-Org-Id") });
    if (fail) return new Response(JSON.stringify({ code: 500, msg: "成员加载失败" }));
    const page = Number(url.searchParams.get("pageNum"));
    const list = total === 0 ? [] : page === 1 ? [member("1", true), member("2")] : [member("13")];
    return json({ list, total });
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(projectId = "21"): Promise<void> {
  await act(async (): Promise<void> => {
    root.render(
      <QueryClientProvider client={client}>
        <ProjectMembers projectId={projectId} />
      </QueryClientProvider>,
    );
  });
}

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    });
    assertion();
  });
}

async function click(label: string): Promise<void> {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === label,
  );
  expect(button).toBeDefined();
  await act(async (): Promise<void> => {
    button!.click();
  });
}

test("使用用户端接口展示当前成员、人数和负责人，不增加成员状态或管理操作", async (): Promise<void> => {
  await mount();
  await waitFor(() => expect(container.textContent).toContain("成员1"));
  expect(calls[0].url.pathname).toBe("/app/projects/21/members");
  expect(calls[0].orgId).toBe("11");
  expect(calls[0].url.searchParams.get("pageSize")).toBe("12");
  expect(container.textContent).toContain("13 人");
  expect(container.textContent).toContain("负责人");
  expect(container.querySelectorAll("li")).toHaveLength(2);
  for (const label of ["已退出", "已加入", "状态", "邀请", "移除"])
    expect(container.textContent).not.toContain(label);
});

test("分页只更新成员区，切换企划或组织回到第一页", async (): Promise<void> => {
  await mount();
  await waitFor(() => expect(container.textContent).toContain("成员1"));
  await click("下一页");
  await waitFor(() => expect(container.textContent).toContain("成员13"));
  expect(calls.at(-1)?.url.searchParams.get("pageNum")).toBe("2");
  await mount("22");
  await waitFor(() => expect(calls.at(-1)?.url.pathname).toBe("/app/projects/22/members"));
  expect(calls.at(-1)?.url.searchParams.get("pageNum")).toBe("1");
  await waitFor(() => expect(container.textContent).toContain("成员1"));
  await click("下一页");
  await waitFor(() => expect(container.textContent).toContain("成员13"));
  await act(async (): Promise<void> => {
    saveCurrentOrganization("12");
  });
  await waitFor(() => expect(calls.at(-1)?.orgId).toBe("12"));
  expect(calls.at(-1)?.url.searchParams.get("pageNum")).toBe("1");
});

test("空列表不展示分页或假成员", async (): Promise<void> => {
  total = 0;
  await mount();
  await waitFor(() => expect(container.textContent).toContain("暂无企划成员"));
  expect(container.textContent).toContain("0 人");
  expect(container.querySelector("li")).toBeNull();
  expect(container.querySelector("nav")).toBeNull();
});

test("加载失败明确提示且可重试，不误报空成员", async (): Promise<void> => {
  fail = true;
  await mount();
  await waitFor(() =>
    expect(container.querySelector("[role=alert]")?.textContent).toContain("成员加载失败"),
  );
  expect(container.textContent).not.toContain("暂无企划成员");
  fail = false;
  await click("重试");
  await waitFor(() => expect(container.textContent).toContain("成员1"));
  expect(container.querySelector("[role=alert]")).toBeNull();
});

test("成员减少后自动回到仍有效的末页", async (): Promise<void> => {
  await mount();
  await waitFor(() => expect(container.textContent).toContain("成员1"));
  await click("下一页");
  await waitFor(() => expect(container.textContent).toContain("成员13"));
  total = 2;
  await act(async (): Promise<void> => {
    await client.invalidateQueries();
  });
  await waitFor(() => expect(container.textContent).toContain("2 人"));
  expect(calls.at(-1)?.url.searchParams.get("pageNum")).toBe("1");
  expect(container.querySelector("ul")?.textContent).not.toContain("成员13");
});
