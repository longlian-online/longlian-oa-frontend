// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";

import ReleaseMarkdown from "./index";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

function render(text: string): void {
  act(() => {
    root?.render(<ReleaseMarkdown text={text} />);
  });
}

describe("release markdown", () => {
  test("renders headings, lists, links and code as text elements", () => {
    render("# 标题\n\n- 一条新增\n\n看 [说明](https://example.com/note)\n\n`版本`");
    expect(container?.textContent).toContain("标题");
    expect(container?.textContent).toContain("一条新增");
    expect(container?.querySelector("a")?.getAttribute("href")).toBe("https://example.com/note");
    expect(container?.querySelector("code")?.textContent).toBe("版本");
  });

  test("does not render images or raw html", () => {
    render(
      "![封面](https://example.com/a.png)\n\n<script>alert(1)</script>\n\n[坏链接](javascript:alert(1))",
    );
    expect(container?.querySelector("img")).toBeNull();
    expect(container?.querySelector("script")).toBeNull();
    expect(container?.querySelector("a")).toBeNull();
    expect(container?.textContent).toContain("封面");
    expect(container?.textContent).toContain("<script>alert(1)</script>");
  });
});
