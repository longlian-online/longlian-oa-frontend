// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vite-plus/test";

import ProjectTypeCustomFormEditor, { type ProjectTypeCustomFormItem } from "./index";

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

function renderEditor(
  initial: ProjectTypeCustomFormItem[] = [],
  presets: Array<{ id: string; name: string }> = [],
): { fields: () => ProjectTypeCustomFormItem[] } {
  let fields = initial;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = (): void => {
    act(() => {
      root?.render(
        <ProjectTypeCustomFormEditor
          value={fields}
          presets={presets}
          onChange={(next) => {
            fields = next;
            render();
          }}
        />,
      );
    });
  };
  render();
  return { fields: () => fields };
}

test("adds, renames, reorders, and removes rows", async () => {
  const editor = renderEditor();
  const add = container?.querySelector("button");
  if (!add) throw new Error("缺少添加字段按钮");

  await act(async () => add.click());
  await act(async () => add.click());

  const inputs = [
    container?.querySelector<HTMLInputElement>('input[aria-label="字段 1 名称"]'),
    container?.querySelector<HTMLInputElement>('input[aria-label="字段 2 名称"]'),
  ];
  if (!inputs[0] || !inputs[1]) throw new Error("缺少两行字段输入");

  await act(async () => {
    setNativeValue(inputs[0]!, "作者");
    inputs[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    setNativeValue(inputs[1]!, "备注");
    inputs[1]!.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(editor.fields().map((field) => field.name)).toEqual(["作者", "备注"]);

  const down = container?.querySelector<HTMLButtonElement>('button[aria-label="下移字段 作者"]');
  if (!down) throw new Error("缺少下移按钮");
  await act(async () => down.click());
  expect(editor.fields().map((field) => field.name)).toEqual(["备注", "作者"]);

  const remove = container?.querySelector<HTMLButtonElement>('button[aria-label="移除字段 作者"]');
  if (!remove) throw new Error("缺少移除按钮");
  await act(async () => remove.click());
  expect(editor.fields().map((field) => field.name)).toEqual(["备注"]);
});

test("picking a preset fills the name and links the preset field", async () => {
  const editor = renderEditor(
    [{ id: "row-1", name: "", required: false }],
    [{ id: "preset-1", name: "作者" }],
  );
  const open = container?.querySelector<HTMLButtonElement>(
    'button[aria-label="选择字段 1 的预置表单字段"]',
  );
  if (!open) throw new Error("缺少预置字段按钮");
  await act(async () => open.click());
  const option = document.querySelector<HTMLButtonElement>('[role="option"]');
  if (!option) throw new Error("缺少预置字段选项");
  await act(async () => option.click());

  expect(editor.fields()).toEqual([
    { id: "row-1", name: "作者", presetFieldId: "preset-1", required: false },
  ]);
});

test("editing the name after picking a preset detaches the preset field", async () => {
  const editor = renderEditor(
    [{ id: "row-1", name: "作者", presetFieldId: "preset-1", required: false }],
    [{ id: "preset-1", name: "作者" }],
  );
  const input = container?.querySelector<HTMLInputElement>('input[aria-label="字段 1 名称"]');
  if (!input) throw new Error("缺少字段名输入");
  await act(async () => {
    setNativeValue(input, "原作");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(editor.fields()).toEqual([{ id: "row-1", name: "原作", required: false }]);
});

test("toggling required updates the row", async () => {
  const editor = renderEditor([{ id: "row-1", name: "作者", required: false }]);
  const toggle = container?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!toggle) throw new Error("缺少必填开关");
  await act(async () => toggle.click());
  expect(editor.fields()).toEqual([{ id: "row-1", name: "作者", required: true }]);
});
