// @vitest-environment happy-dom
import { act, useState, type ComponentProps, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import WorkflowEditor, { type WorkflowEditorNode } from "./index";
import type WorkflowCanvas from "./WorkflowCanvas";

vi.mock("./WorkflowCanvas", () => ({
  default: (props: ComponentProps<typeof WorkflowCanvas>): ReactElement => (
    <div>
      {props.nodes.map((node) => (
        <button key={node.localId} onClick={() => props.onSelectNode(node.localId)}>
          {node.localId}
        </button>
      ))}
      <button onClick={() => props.onSelectNode(null)}>取消选择</button>
    </div>
  ),
}));
vi.mock("./NodePanel", () => ({ default: () => null }));

let root: Root;
let container: HTMLDivElement;
let nodes: WorkflowEditorNode[];

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach((): void => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function Harness(): ReactElement {
  const [value, setValue] = useState<WorkflowEditorNode[]>([
    { localId: "one", baseTaskId: "1", customName: "", sort: 1, parallelSort: 1 },
    { localId: "two", baseTaskId: "2", customName: "校对", sort: 2, parallelSort: 1 },
  ]);
  nodes = value;
  return (
    <ConfirmDialogProvider>
      <WorkflowEditor value={value} onChange={setValue} baseTasks={[]} loadingBaseTasks={false} />
    </ConfirmDialogProvider>
  );
}

async function click(name: string): Promise<void> {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === name,
  );
  if (!button) throw new Error(`缺少按钮：${name}`);
  await act(async () => button.click());
}

async function mount(): Promise<HTMLInputElement> {
  await act(async () => root.render(<Harness />));
  await click("one");
  return container.querySelector("input")!;
}

async function inputValue(
  input: HTMLInputElement,
  value: string,
  composing = false,
): Promise<void> {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;
  await act(async () => {
    descriptor.set!.call(input, value);
    input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: value,
        inputType: composing ? "insertCompositionText" : "insertText",
        isComposing: composing,
      }),
    );
  });
}

test("中文组词及选字期间不会回写旧值，连续输入后只保留确认的汉字", async (): Promise<void> => {
  const input = await mount();
  const descriptor = Object.getOwnPropertyDescriptor(input, "value")!;
  const writes: string[] = [];
  Object.defineProperty(input, "value", {
    configurable: true,
    get(): string {
      return descriptor.get!.call(this) as string;
    },
    set(value: string): void {
      writes.push(value);
      descriptor.set!.call(this, value);
    },
  });

  for (const [prefix, pinyin, confirmed] of [
    ["", "fan", "翻"],
    ["翻", "yi", "翻译"],
  ]) {
    await act(async () => {
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    });
    for (let length = 1; length <= pinyin.length; length++) {
      const value = prefix + pinyin.slice(0, length);
      await inputValue(input, value, true);
      expect(input.value).toBe(value);
      expect(nodes[0].customName).toBe(value);
    }
    await inputValue(input, confirmed, true);
    await act(async () => {
      input.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: confirmed }),
      );
    });
    await inputValue(input, confirmed);
  }

  expect(input.value).toBe("翻译");
  expect(nodes[0].customName).toBe("翻译");
  expect(writes).toEqual([]);
});

test("英文编辑、切换节点和退场后的重新选择保留各自名称", async (): Promise<void> => {
  const input = await mount();
  await inputValue(input, "Translate");
  await click("two");
  expect(container.querySelector("input")?.value).toBe("校对");
  await inputValue(container.querySelector("input")!, "复核");
  await click("one");
  expect(container.querySelector("input")?.value).toBe("Translate");
  await inputValue(container.querySelector("input")!, "");

  vi.useFakeTimers();
  await click("取消选择");
  expect(container.querySelector("input")).not.toBeNull();
  await act(async () => vi.advanceTimersByTime(200));
  expect(container.querySelector("input")).toBeNull();
  await click("two");
  expect(container.querySelector("input")?.value).toBe("复核");
  expect(nodes.map((node) => node.customName)).toEqual(["", "复核"]);
});
