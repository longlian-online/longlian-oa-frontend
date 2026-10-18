// @vitest-environment happy-dom
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vite-plus/test";

import RemoteImage from "./index";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const naturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "naturalWidth");
const complete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  if (naturalWidth) Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", naturalWidth);
  if (complete) Object.defineProperty(HTMLImageElement.prototype, "complete", complete);
  vi.restoreAllMocks();
});

function mount(element: ReactElement): void {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(element);
  });
}

function frame(): HTMLElement {
  const element = container?.querySelector("[data-slot='remote-image']");
  if (!(element instanceof HTMLElement)) throw new Error("缺少图片框");
  return element;
}

function image(): HTMLImageElement {
  const element = frame().querySelector("img");
  if (!(element instanceof HTMLImageElement)) throw new Error("缺少图片");
  return element;
}

function paintSize(width: number): void {
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
    configurable: true,
    get: () => width,
  });
}

test("未解码时只显示占位，图片本身不可见", () => {
  paintSize(0);
  mount(<RemoteImage src="/cover.png" alt="封面" />);

  expect(frame().dataset.state).toBe("loading");
  expect(frame().querySelector("[data-slot='remote-image-placeholder']")).not.toBeNull();
  expect(image().className).toContain("opacity-0");
});

test("解码完成后淡入，并撤掉占位", async () => {
  paintSize(32);
  vi.spyOn(HTMLImageElement.prototype, "decode").mockResolvedValue(undefined);
  mount(<RemoteImage src="/cover.png" alt="封面" />);

  await act(async () => {
    image().dispatchEvent(new Event("load"));
  });

  expect(frame().dataset.state).toBe("ready");
  expect(frame().querySelector("[data-slot='remote-image-placeholder']")).toBeNull();
  expect(image().className).toContain("opacity-100");
  expect(image().className).not.toContain("opacity-0");
});

test("缓存图片在绘制前就直接显示", async () => {
  paintSize(32);
  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    configurable: true,
    get: () => true,
  });
  vi.spyOn(HTMLImageElement.prototype, "decode").mockResolvedValue(undefined);
  const onLoad = vi.fn();

  await act(async () => {
    mount(<RemoteImage src="/cached.png" alt="封面" onLoad={onLoad} />);
  });

  expect(frame().dataset.state).toBe("ready");
  expect(frame().querySelector("[data-slot='remote-image-placeholder']")).toBeNull();
  expect(onLoad).toHaveBeenCalledOnce();
});

test("加载失败时隐藏破图并显示原有占位", async () => {
  paintSize(0);
  const onError = vi.fn();
  mount(<RemoteImage src="/missing.png" alt="封面" fallback="暂无封面" onError={onError} />);

  await act(async () => {
    image().dispatchEvent(new Event("error"));
  });

  expect(frame().dataset.state).toBe("error");
  expect(frame().querySelector("img")).toBeNull();
  expect(frame().textContent).toBe("暂无封面");
  expect(onError).toHaveBeenCalledOnce();
});

test("更换地址后回到占位，不沿用上一张图", async () => {
  paintSize(32);
  vi.spyOn(HTMLImageElement.prototype, "decode").mockResolvedValue(undefined);
  function Harness(): ReactElement {
    const [src, setSrc] = useState("/first.png");
    return (
      <>
        <button type="button" onClick={() => setSrc("/second.png")}>
          更换
        </button>
        <RemoteImage src={src} alt="封面" />
      </>
    );
  }
  mount(<Harness />);
  await act(async () => {
    image().dispatchEvent(new Event("load"));
  });
  expect(frame().dataset.state).toBe("ready");

  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    configurable: true,
    get: () => false,
  });
  await act(async () => {
    container?.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(frame().dataset.state).toBe("loading");
  expect(image().getAttribute("src")).toBe("/second.png");
  expect(image().className).toContain("opacity-0");
  expect(frame().querySelector("[data-slot='remote-image-placeholder']")).not.toBeNull();
});
