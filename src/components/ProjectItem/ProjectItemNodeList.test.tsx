// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import ProjectItemNodeList from "./ProjectItemNodeList";
import type { ProjectItemNodeVO } from "@/types/projectItem";

function renderNodes(nodes: ProjectItemNodeVO[]): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<ProjectItemNodeList nodes={nodes} />);
  return container;
}

test("后续阶段均为 IN_PROGRESS 时，只有最早未完成阶段标为当前", () => {
  const nodes = ["翻译", "校对", "嵌字", "审核"].map<ProjectItemNodeVO>((name, index) => ({
    name,
    sort: index + 1,
    parallelSort: 0,
    parallelCount: 1,
    state: "IN_PROGRESS",
  }));
  const view = renderNodes(nodes);
  expect([...view.querySelectorAll("li")].map((node) => node.getAttribute("aria-label"))).toEqual([
    "翻译：当前阶段",
    "校对：未完成",
    "嵌字：未完成",
    "审核：未完成",
  ]);
  expect(view.textContent).not.toContain("当前");
});

test("按阶段顺序定位当前并行组，不把后续同名节点当成当前", () => {
  const view = renderNodes([
    { name: "校对", sort: 3, parallelSort: 0, parallelCount: 1, state: "IN_PROGRESS" },
    { name: "校对", sort: 2, parallelSort: 1, parallelCount: 2, state: "IN_PROGRESS" },
    { name: "图源", sort: 1, parallelSort: 0, parallelCount: 1, state: "COMPLETED" },
    { name: "翻译", sort: 2, parallelSort: 0, parallelCount: 2, state: "IN_PROGRESS" },
  ]);
  expect([...view.querySelectorAll("li")].map((node) => node.getAttribute("aria-label"))).toEqual([
    "图源：已完成",
    "翻译：当前阶段",
    "校对：当前阶段",
    "校对：未完成",
  ]);
});

test.each(["COMPLETED", "LOCKED"] as const)("所有节点为 %s 时不产生虚假的当前阶段", (state) => {
  const view = renderNodes([
    { name: "翻译", sort: 1, parallelSort: 0, parallelCount: 1, state },
    { name: "校对", sort: 2, parallelSort: 0, parallelCount: 1, state },
  ]);
  expect(view.querySelector('[aria-label$="当前阶段"]')).toBeNull();
});
