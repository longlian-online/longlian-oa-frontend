// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import AppBreadcrumb from "./AppBreadcrumb";

vi.mock("@/hooks/queries/useApiQuery", () => ({ useApiQuery: () => ({ data: undefined }) }));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(pathname: string, state: unknown): void {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[{ pathname, state }]}>
        <AppBreadcrumb />
      </MemoryRouter>,
    );
  });
}

test("offers a generic workflow list return entry", () => {
  render("/dashboard/org-admin/create", {
    listReturnTo: "/dashboard/org-admin/workflows?keyword=test&page=3",
  });
  expect(container.querySelector("a")?.getAttribute("href")).toBe(
    "/dashboard/org-admin/workflows?keyword=test&page=3",
  );
});

test("planning list return keeps its legacy priority", () => {
  render("/dashboard/planning/create", {
    listReturnTo: "/dashboard/planning?page=2",
    planningListReturnTo: "/dashboard/planning?page=4",
  });
  expect(container.querySelector("a")?.getAttribute("href")).toBe("/dashboard/planning?page=4");
});

test("keeps workshop and the nearer paginated project items list together", () => {
  render("/dashboard/planning/21/items/42", {
    workshopReturnTo: "/dashboard/workshop?page=4",
    listReturnTo: "/dashboard/workshop?page=4",
    projectItemsReturnTo: "/dashboard/planning/21/items?page=3&status=ACTIVE",
  });
  const links = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
  expect(links[0]).toBe("/dashboard/workshop?page=4");
  expect(links).toContain("/dashboard/planning/21/items?page=3&status=ACTIVE");
});

test("内嵌项目列表来源与更上层工坊同时保留", () => {
  render("/dashboard/planning/21/items/42", {
    workshopReturnTo: "/dashboard/workshop?page=4",
    projectItemsReturnTo: "/dashboard/planning/21?status=COMPLETED&page=2",
  });
  const links = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
  expect(links).toContain("/dashboard/workshop?page=4");
  expect(links).toContain("/dashboard/planning/21?status=COMPLETED&page=2");
});

test("任务广场上层来源不被近层项目列表覆盖", () => {
  render("/dashboard/planning/21/items/42", {
    listReturnTo: "/dashboard/task-plaza?taskType=101&page=3",
    projectItemsReturnTo: "/dashboard/planning/21?status=ALL&page=2",
  });
  const links = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
  expect(links).toContain("/dashboard/task-plaza?taskType=101&page=3");
  expect(links).toContain("/dashboard/planning/21?status=ALL&page=2");
});

test("invalid generic destinations are not rendered", () => {
  render("/dashboard/planning/create", { listReturnTo: "https://evil.example" });
  expect(container.querySelector("a")?.getAttribute("href")).toBe("/dashboard/planning");
});
