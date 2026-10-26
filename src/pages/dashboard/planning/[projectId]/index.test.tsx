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

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  vi.stubGlobal("fetch", async (input: string): Promise<Response> => {
    const url = new URL(input, "http://localhost");
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
        isCreator: false,
        hasItems: false,
        createdAt: "2026-10-01 10:00:00",
      });
    }
    if (url.pathname === "/app/projects/21/items") {
      return json({ list: [], total: 0, pageNum: 1, pageSize: 4, hasNext: false });
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
