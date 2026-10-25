// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vite-plus/test";

import ProjectMetadataEditor, { type ProjectMetadataPresetTag } from "./index";

import type { ProjectMetadataTag } from "@/lib/projectMetadata";

const presets: ProjectMetadataPresetTag[] = [
  { id: "author", name: "作者", color: "blue" },
  { id: "rush", name: "加急", color: "amber" },
];

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function setNativeValue(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  Reflect.apply(descriptor!.set as (this: HTMLInputElement, value: string) => void, input, [value]);
}

function renderEditor(initial: ProjectMetadataTag): { draft: () => ProjectMetadataTag } {
  let draft = initial;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = (): void => {
    act(() => {
      root?.render(
        <ProjectMetadataEditor
          tags={[]}
          draft={draft}
          presets={presets}
          onTagsChange={() => undefined}
          onDraftChange={(next) => {
            draft = next;
            render();
          }}
        />,
      );
    });
  };
  render();
  return { draft: () => draft };
}

async function openTagForm(): Promise<void> {
  const addButton = [...container!.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("添加标签"),
  );
  await act(async () => {
    addButton?.click();
  });
}

test("选择预制标签后填入名称和颜色，并保留用户已填写的值", async () => {
  const editor = renderEditor({ key: "", value: "smile_snow" });
  await openTagForm();

  const presetTrigger = container!.querySelector<HTMLButtonElement>('[aria-label="选择预制标签"]');
  await act(async () => {
    presetTrigger?.click();
  });
  const list = container!.querySelector('[role="listbox"]');
  expect(list?.parentElement).toBe(presetTrigger?.parentElement);

  const author = [...container!.querySelectorAll('[role="option"]')].find((option) =>
    option.textContent?.includes("作者"),
  );
  await act(async () => {
    author?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(editor.draft()).toEqual({ key: "作者", value: "smile_snow", color: "blue" });
});

test("输入标签名时在输入框下方模糊匹配预制标签", async () => {
  renderEditor({ key: "", value: "" });
  await openTagForm();
  const keyInput = container!.querySelector<HTMLInputElement>('input[placeholder="标签名"]');
  await act(async () => {
    setNativeValue(keyInput!, "作");
    keyInput!.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const list = container!.querySelector('[role="listbox"]');
  expect(list?.parentElement).toBe(keyInput?.parentElement);
  const options = [...container!.querySelectorAll('[role="option"]')].map(
    (option) => option.textContent,
  );
  expect(options).toEqual(["作者"]);
});

test("没有预制标签时仍可手动填写", async () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <ProjectMetadataEditor
        tags={[]}
        draft={{ key: "", value: "" }}
        presets={[]}
        onTagsChange={() => undefined}
        onDraftChange={() => undefined}
      />,
    );
  });
  await openTagForm();

  expect(container.textContent).toContain("标签名");
  expect(container.textContent).toContain("值（选填）");
  const presetTrigger = container.querySelector<HTMLButtonElement>('[aria-label="选择预制标签"]');
  await act(async () => {
    presetTrigger?.click();
  });
  expect(container.textContent).toContain("暂无预制标签");
});
