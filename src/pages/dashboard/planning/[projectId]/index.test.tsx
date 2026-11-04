// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { clearSession, saveSession } from "@/lib/session";
import ProjectDetail from "@/pages/dashboard/planning/[projectId]";

const DESCRIPTION = "第一行  保留空格\n第二行";

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let isCreator: boolean;
let canManage: boolean | undefined;
let attachments: unknown[];
const calls: string[] = [];

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  isCreator = false;
  canManage = undefined;
  attachments = [];
  calls.length = 0;
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input, "http://localhost");
    calls.push(`${init?.method ?? "GET"} ${url.pathname}`);
    if (init?.method === "DELETE" && url.pathname === "/app/projects/21") return json(null);
    if (url.pathname === "/app/projects/21") {
      return json({
        id: 21,
        title: "春季企划",
        alias: "春日",
        typeName: "漫画",
        description: DESCRIPTION,
        metadata: JSON.stringify({ tags: [{ key: "作者", value: "smile" }] }),
        status: "进行中",
        progressPercent: 40,
        claimedTaskCount: 2,
        pendingTaskCount: 3,
        inWorkshop: true,
        isCreator,
        canManage: canManage ?? isCreator,
        hasItems: false,
        createdAt: "2026-10-01 10:00:00",
      });
    }
    if (url.pathname === "/app/projects/21/items") {
      return json({ list: [], total: 0, pageNum: 1, pageSize: 4, hasNext: false });
    }
    if (url.pathname === "/app/projects/21/attachments") {
      return json(attachments);
    }
    throw new Error(`未预期请求：${url.pathname}`);
  });
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

async function mount(entry: string): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <ConfirmDialogProvider>
            <Routes>
              <Route path="/dashboard/planning/:projectId" element={<ProjectDetail />} />
              <Route path="/dashboard/planning" element={<h1>企划列表</h1>} />
            </Routes>
          </ConfirmDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    });
    assertion();
  });
}

function descriptionParagraphs(): HTMLParagraphElement[] {
  const section = container.querySelector("section[aria-labelledby='project-info-title']");
  if (!section) throw new Error("缺少关于作品");
  return Array.from(section.querySelectorAll("p")).filter(
    (paragraph): paragraph is HTMLParagraphElement => paragraph.textContent === DESCRIPTION,
  );
}

test("删除企划后返回列表，不再请求该企划详情和项目列表", async (): Promise<void> => {
  isCreator = true;
  await mount("/dashboard/planning/21");
  await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("春季企划"));
  await act(async () =>
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("更多"))
      ?.click(),
  );
  await act(async () =>
    [...document.querySelectorAll<HTMLElement>("[role=menuitem]")]
      .find((item) => item.textContent?.trim() === "删除企划")
      ?.click(),
  );
  await act(async () =>
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "删除")
      ?.click(),
  );
  await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("企划列表"));
  expect(calls).toEqual([
    "GET /app/projects/21",
    "GET /app/projects/21/items",
    "GET /app/projects/21/attachments",
    "DELETE /app/projects/21",
  ]);
});

test.each(["/dashboard/planning/21", "/dashboard/planning/21?view=about"])(
  "detail page %s keeps typed line breaks only in the about section",
  async (entry): Promise<void> => {
    await mount(entry);
    await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("春季企划"));

    expect(container.querySelector("#project-overview")?.textContent ?? "").not.toContain("第一行");
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(
      entry.includes("view=about"),
    );
    const paragraphs = descriptionParagraphs();
    expect(paragraphs).toHaveLength(2);
    for (const paragraph of paragraphs) {
      expect(paragraph.className).toContain("whitespace-pre-wrap");
      expect(paragraph.textContent).toBe(DESCRIPTION);
    }
    expect(container.textContent).toContain("漫画");
    expect(container.textContent).toContain("春日");
    expect(container.textContent).toContain("进行中");
    expect(container.textContent).toContain("40%");
    expect(container.textContent).toContain("作者");
  },
);

const ATTACHMENT = {
  id: "900",
  fileId: "800",
  fileName: "设定集.pdf",
  fileSize: 2048,
  fileMime: "application/pdf",
  uploaderId: "1",
  uploaderName: "阿澄",
  createdAt: "2026-10-02 09:30:00",
};

function attachmentSection(): HTMLElement {
  const section = container.querySelector<HTMLElement>("#project-attachments");
  if (!section) throw new Error("缺少附件区域");
  return section;
}

test("附件区域展示文件名、大小、上传人与上传时间", async (): Promise<void> => {
  attachments = [ATTACHMENT];
  await mount("/dashboard/planning/21");
  await waitFor(() => expect(attachmentSection().textContent).toContain("设定集.pdf"));

  const text = attachmentSection().textContent ?? "";
  expect(text).toContain("2 KB");
  expect(text).toContain("阿澄");
  expect(text).toContain("2026");
  expect(attachmentSection().querySelector("h2")?.textContent).toBe("附件");
});

test("非负责人只看到下载", async (): Promise<void> => {
  attachments = [ATTACHMENT];
  await mount("/dashboard/planning/21");
  await waitFor(() => expect(attachmentSection().textContent).toContain("设定集.pdf"));
  expect(container.textContent).not.toContain("添加附件");
  expect(container.querySelector("[aria-label='删除 设定集.pdf']")).toBeNull();
  expect(container.querySelector("[aria-label='下载 设定集.pdf']")).not.toBeNull();
});

test("负责人可以添加和删除附件", async (): Promise<void> => {
  isCreator = true;
  attachments = [ATTACHMENT];
  await mount("/dashboard/planning/21");
  await waitFor(() => expect(attachmentSection().textContent).toContain("设定集.pdf"));
  expect(container.textContent).toContain("添加附件");
  expect(container.querySelector("[aria-label='删除 设定集.pdf']")).not.toBeNull();
});

test("组织管理者可以操作企划，但不会被标成负责人", async (): Promise<void> => {
  isCreator = false;
  canManage = true;
  attachments = [ATTACHMENT];
  await mount("/dashboard/planning/21");
  await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("春季企划"));
  expect(container.textContent).toContain("创建项目");
  expect(container.textContent).toContain("编辑资料");
  expect(container.textContent).toContain("已加入");
  expect(container.textContent).not.toContain("负责人");
  await waitFor(() => expect(attachmentSection().textContent).toContain("设定集.pdf"));
  expect(container.textContent).toContain("添加附件");
  expect(container.querySelector("[aria-label='删除 设定集.pdf']")).not.toBeNull();
  await act(async () =>
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("更多"))
      ?.click(),
  );
  const items = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")];
  expect(items.some((item) => item.textContent?.trim() === "退出企划")).toBe(true);
  expect(items.some((item) => item.textContent?.trim() === "删除企划")).toBe(true);
});

test("明确拒绝管理权限时，不把创建者身份当作授权", async (): Promise<void> => {
  isCreator = true;
  canManage = false;
  await mount("/dashboard/planning/21");
  await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("春季企划"));
  expect(container.textContent).toContain("负责人");
  expect(container.textContent).not.toContain("编辑资料");
  expect(
    [...container.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "创建项目",
    ),
  ).toBe(false);
});

test("右上角导航包含附件入口", async (): Promise<void> => {
  await mount("/dashboard/planning/21");
  await waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("春季企划"));
  const nav = container.querySelector("nav[aria-label='本页目录']");
  const labels = [...(nav?.querySelectorAll("a") ?? [])].map((link) => link.textContent);
  expect(labels).toEqual(["企划概览", "项目", "关于作品", "附件"]);
  expect(nav?.querySelector("a[href='#project-attachments']")).not.toBeNull();
  const about = container.querySelector("#project-info");
  const attachments = container.querySelector("#project-attachments");
  if (!about || !attachments) throw new Error("缺少页面区块");
  expect(about.compareDocumentPosition(attachments) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});
