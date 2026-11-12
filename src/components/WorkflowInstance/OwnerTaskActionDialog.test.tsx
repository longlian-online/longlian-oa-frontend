// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vite-plus/test";

import OwnerTaskActionDialog from "./OwnerTaskActionDialog";
import type { ItemTaskInstanceVO } from "@/types/workflowInstance";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const instance: ItemTaskInstanceVO = {
  id: "task",
  revision: "9007199254740993",
  name: "翻译",
  status: "CLAIMED",
  sort: 1,
  parallelSort: 1,
  assigneeId: "member",
  assigneeNickname: "小明",
  createdAt: "",
};

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  vi.restoreAllMocks();
});

async function mount(element: ReactElement): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(element));
}

function button(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent === text,
  );
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}

test("in-flight confirmation locks duplicate submits, cancel, close and escape", async () => {
  let resolve!: (value: boolean) => void;
  const pending = new Promise<boolean>((complete) => {
    resolve = complete;
  });
  const confirm = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(true);
  const close = vi.fn();
  await mount(
    <OwnerTaskActionDialog
      instance={instance}
      taskTitle="翻译"
      onClose={close}
      onConfirm={confirm}
    />,
  );
  await act(async () => {
    const submit = button("确认取消接取");
    submit.click();
    submit.click();
  });
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(button("处理中…").disabled).toBe(true);
  expect(button("取消").disabled).toBe(true);
  expect(document.querySelector("[data-slot='dialog-close']")).toBeNull();
  await act(async () => {
    button("取消").click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  expect(close).not.toHaveBeenCalled();
  await act(async () => resolve(false));
  expect(document.querySelector("[role='alert']")).not.toBeNull();
  await act(async () => button("确认取消接取").click());
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledOnce();
});

test("cancellation needs no input and failure keeps the dialog open", async () => {
  const confirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const close = vi.fn();
  await mount(
    <OwnerTaskActionDialog
      instance={instance}
      taskTitle="第一话 · 翻译"
      onClose={close}
      onConfirm={confirm}
    />,
  );
  expect(document.body.textContent).toContain("第一话 · 翻译");
  expect(document.body.textContent).toContain("小明");
  expect(document.body.textContent).toContain("当前执行人：小明");
  expect(document.querySelector("textarea")).toBeNull();
  expect(document.querySelector("label")).toBeNull();
  expect(document.querySelector("#owner-task-reason-help")).toBeNull();
  expect(button("确认取消接取").disabled).toBe(false);
  await act(async () => button("确认取消接取").click());
  expect(confirm).toHaveBeenCalledWith();
  expect(document.querySelector("[role='alert']")?.textContent).toContain("操作未完成");
  expect(close).not.toHaveBeenCalled();
  await act(async () => button("确认取消接取").click());
  expect(close).toHaveBeenCalledOnce();
});

test("cancel without confirmation sends no action", async () => {
  const confirm = vi.fn();
  const close = vi.fn();
  await mount(
    <OwnerTaskActionDialog
      instance={instance}
      taskTitle="翻译"
      onClose={close}
      onConfirm={confirm}
    />,
  );
  await act(async () => button("取消").click());
  expect(close).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
});

test.each(["escape", "close"] as const)(
  "%s dismisses an idle dialog without sending an action",
  async (method) => {
    const confirm = vi.fn();
    const close = vi.fn();
    await mount(
      <OwnerTaskActionDialog
        instance={instance}
        taskTitle="翻译"
        onClose={close}
        onConfirm={confirm}
      />,
    );
    await act(async () => {
      if (method === "escape") {
        document
          .querySelector("[role='dialog']")
          ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      } else {
        const dismiss = document.querySelector("[data-slot='dialog-close']");
        if (!(dismiss instanceof HTMLButtonElement)) throw new Error("Missing close button");
        dismiss.click();
      }
    });
    expect(close).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  },
);
