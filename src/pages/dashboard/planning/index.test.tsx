// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import AppBreadcrumb from "@/components/layout/AppBreadcrumb";
import { clearSession, saveSession } from "@/lib/session";
import Planning from "@/pages/dashboard/planning";

import type { ProjectInfoVO } from "@/types/planning";

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const requests: URL[] = [];

const project: ProjectInfoVO = {
  id: 21,
  title: "春季企划",
  description: "简介",
  projectType: "漫画",
  projectStatus: "进行中",
  creatorNickname: "企划负责人",
  creatorLastSubmittedAt: "2026-10-24 09:30:00",
};

function LocationProbe(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="地址">{location.search}</output>
      <button onClick={() => navigate(-1)}>后退</button>
    </>
  );
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string): Promise<Response> => {
      const url = new URL(input, "http://localhost");
      requests.push(url);
      if (url.pathname.endsWith("/projects/types")) {
        return json([]);
      }
      if (url.pathname.endsWith("/projects/21")) {
        return json({
          id: 21,
          title: "春季企划",
          typeName: "漫画",
          status: "进行中",
          progressPercent: 0,
          claimedTaskCount: 0,
          pendingTaskCount: 0,
          inWorkshop: false,
          isCreator: false,
          hasItems: false,
        });
      }
      if (url.pathname.endsWith("/projects")) {
        return json({ list: [project], total: 12, pageNum: 1, pageSize: 11, hasNext: true });
      }
      throw new Error(`未预期请求：${url.pathname}`);
    }),
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

function json(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, data }));
}

async function mount(entry = "/dashboard/planning"): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <LocationProbe />
          <Routes>
            <Route path="/dashboard/planning" element={<Planning />} />
            <Route path="/dashboard/planning/:projectId" element={<AppBreadcrumb />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

function address(): string {
  return container.querySelector("output")?.textContent ?? "";
}

function button(name: string): HTMLButtonElement {
  const element = Array.from(container.querySelectorAll("button")).find(
    (candidate): boolean =>
      candidate.textContent === name || candidate.getAttribute("aria-label") === name,
  );
  if (!element) throw new Error(`缺少按钮：${name}`);
  return element;
}

async function click(name: string): Promise<void> {
  await act(async () => button(name).click());
}

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    });
    assertion();
  });
}

function listRequests(): URL[] {
  return requests.filter((url) => url.pathname.endsWith("/projects"));
}

test("opening page two requests that page and keeps it in the address", async (): Promise<void> => {
  await mount("/dashboard/planning?page=2");
  await waitFor((): void => {
    expect(listRequests().at(-1)?.searchParams.get("pageNum")).toBe("2");
    expect(address()).toBe("?page=2");
  });
});

test("returning from a project restores the list page", async (): Promise<void> => {
  await mount();
  await waitFor((): void => expect(container.textContent).toContain("春季企划"));
  await click("2");
  await waitFor((): void => {
    expect(address()).toBe("?page=2");
    expect(listRequests().at(-1)?.searchParams.get("pageNum")).toBe("2");
  });

  const link = container.querySelector<HTMLAnchorElement>('a[aria-label="查看企划：春季企划"]');
  if (!link) throw new Error("缺少企划链接");
  await act(async () => link.click());
  await waitFor((): void => {
    const crumb = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent === "企划",
    );
    expect(crumb?.getAttribute("href")).toBe("/dashboard/planning?page=2");
  });

  await click("后退");
  await waitFor((): void => {
    expect(address()).toBe("?page=2");
    expect(listRequests().at(-1)?.searchParams.get("pageNum")).toBe("2");
  });
});

test("an unusable page cannot request page zero", async (): Promise<void> => {
  await mount("/dashboard/planning?page=0");
  await waitFor((): void => {
    expect(listRequests().at(-1)?.searchParams.get("pageNum")).toBe("1");
  });
});

test("企划普通内容和负责人头像不会导航", async (): Promise<void> => {
  await mount("/dashboard/planning?page=2");
  await waitFor((): void => expect(container.querySelector("article")).not.toBeNull());
  const card = container.querySelector("article")!;
  const title = card.querySelector("h3")!;
  const description = card.querySelector("p")!;
  const type = Array.from(card.querySelectorAll("span")).find(
    (element): boolean => element.textContent === project.projectType,
  )!;

  for (const target of [title, description, type, card, button("负责人信息：企划负责人")]) {
    await act(async () => target.click());
    expect(address()).toBe("?page=2");
    expect(container.querySelector("article")).toBe(card);
  }
});

test("负责人信息支持键盘聚焦、Escape 和离焦关闭且不导航", async (): Promise<void> => {
  await mount("/dashboard/planning?page=2");
  await waitFor((): void => expect(container.querySelector("article")).not.toBeNull());
  const trigger = button("负责人信息：企划负责人");
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    trigger.focus();
  });
  await waitFor((): void => expect(document.querySelector("[role=dialog]")).not.toBeNull());
  expect(document.activeElement).toBe(trigger);
  await act(async () => {
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await waitFor((): void => expect(document.querySelector("[role=dialog]")).toBeNull());
  expect(document.activeElement).toBe(trigger);

  await act(async () => {
    button("1").focus();
    trigger.focus();
  });
  await waitFor((): void => expect(document.querySelector("[role=dialog]")).not.toBeNull());
  await act(async () => button("1").focus());
  await waitFor((): void => expect(document.querySelector("[role=dialog]")).toBeNull());
  expect(address()).toBe("?page=2");
});
