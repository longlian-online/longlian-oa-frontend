// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vite-plus/test";

import ProjectCardTags from "./index";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.restoreAllMocks();
});

test("空标签列表不创建 ResizeObserver 和隐藏测量节点", () => {
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(function MockResizeObserver() {
      return { observe, unobserve: vi.fn(), disconnect };
    }),
  );

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(<ProjectCardTags tags={[]} />);
  });

  expect(observe).not.toHaveBeenCalled();
  expect(container.querySelector("[aria-hidden='true']")).toBeNull();
});

test("有标签时仅观察容器节点，不观察每个子标签", () => {
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(function MockResizeObserver() {
      return { observe, unobserve: vi.fn(), disconnect };
    }),
  );

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <ProjectCardTags
        tags={[
          { key: "题材", value: "日常" },
          { key: "进度", value: "连载中" },
        ]}
      />,
    );
  });

  expect(observe).toHaveBeenCalledTimes(1);
});
