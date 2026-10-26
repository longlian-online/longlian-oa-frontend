// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vite-plus/test";

import ProjectCustomFieldsEditor, { type EditableProjectCustomField } from "./index";

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

function renderEditor(): { fields: () => EditableProjectCustomField[] } {
  let fields: EditableProjectCustomField[] = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = (): void => {
    act(() => {
      root?.render(
        <ProjectCustomFieldsEditor
          fields={fields}
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

test("adds, edits, and removes name/value rows without dropping an empty name", async () => {
  const editor = renderEditor();
  const add = container?.querySelector("button");
  if (!add) throw new Error("缺少添加字段按钮");

  await act(async () => add.click());
  await act(async () => add.click());
  const inputs = container?.querySelectorAll("input");
  if (!inputs || inputs.length !== 4) throw new Error("缺少两行字段输入");

  await act(async () => {
    setNativeValue(inputs[0]!, "作者");
    inputs[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    setNativeValue(inputs[1]!, "xxxx");
    inputs[1]!.dispatchEvent(new Event("input", { bubbles: true }));
    setNativeValue(inputs[3]!, "只有值");
    inputs[3]!.dispatchEvent(new Event("input", { bubbles: true }));
  });

  expect(editor.fields()).toEqual([
    { id: editor.fields()[0]?.id, name: "作者", value: "xxxx" },
    { id: editor.fields()[1]?.id, name: "", value: "只有值" },
  ]);

  const remove = container?.querySelector<HTMLButtonElement>('button[aria-label="删除字段 1"]');
  if (!remove) throw new Error("缺少删除按钮");
  await act(async () => remove.click());
  expect(editor.fields()).toEqual([{ id: editor.fields()[0]?.id, name: "", value: "只有值" }]);
});
