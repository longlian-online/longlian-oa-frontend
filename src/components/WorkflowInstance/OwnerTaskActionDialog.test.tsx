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

async function input(value: string): Promise<void> {
  const textarea = document.querySelector("textarea");
  if (!textarea) throw new Error("Missing reason input");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      textarea,
      value,
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test("confirmation identifies task and assignee, enforces trimmed 1–500-character reasons", async () => {
  const confirm = vi.fn(async () => false);
  await mount(
    <OwnerTaskActionDialog
      action="cancel"
      instance={instance}
      taskTitle="第一话 · 翻译"
      onClose={vi.fn()}
      onConfirm={confirm}
    />,
  );
  expect(document.body.textContent).toContain("第一话 · 翻译");
  expect(document.body.textContent).toContain("小明");
  expect(button("确认取消接取").disabled).toBe(true);
  await input(" \n ");
  expect(button("确认取消接取").disabled).toBe(true);
  await input("原".repeat(501));
  expect(button("确认取消接取").disabled).toBe(true);
  expect(document.querySelector("textarea")?.getAttribute("aria-invalid")).toBe("true");
  await input(`  ${"原".repeat(500)}  `);
  expect(button("确认取消接取").disabled).toBe(false);
  await act(async () => button("确认取消接取").click());
  expect(confirm).toHaveBeenCalledWith("原".repeat(500));
  expect(document.querySelector("[role='alert']")?.textContent).toContain("原因已保留");
  expect(document.querySelector("textarea")?.value).toBe(`  ${"原".repeat(500)}  `);
});

test("in-flight confirmation locks duplicate submits, cancel, close and escape; failure keeps reason for retry", async () => {
  // The project's ES2023 library target does not expose Promise.withResolvers.
  let resolve!: (value: boolean) => void;
  const pending = new Promise<boolean>((complete) => {
    resolve = complete;
  });
  const confirm = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(true);
  const close = vi.fn();
  await mount(
    <OwnerTaskActionDialog
      action="reject"
      instance={{ ...instance, status: "COMPLETED" }}
      taskTitle="翻译"
      onClose={close}
      onConfirm={confirm}
    />,
  );
  await input("  请补全成果  ");
  await act(async () => {
    const submit = button("确认负责人打回");
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
  expect(document.querySelector("textarea")?.value).toBe("  请补全成果  ");
  expect(document.querySelector("[role='alert']")).not.toBeNull();
  await act(async () => button("确认负责人打回").click());
  expect(confirm).toHaveBeenLastCalledWith("请补全成果");
  expect(close).toHaveBeenCalledOnce();
});

test("cancel without confirmation sends no action", async () => {
  const confirm = vi.fn();
  const close = vi.fn();
  await mount(
    <OwnerTaskActionDialog
      action="cancel"
      instance={instance}
      taskTitle="翻译"
      onClose={close}
      onConfirm={confirm}
    />,
  );
  await input("取消原因");
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
        action="cancel"
        instance={instance}
        taskTitle="翻译"
        onClose={close}
        onConfirm={confirm}
      />,
    );
    await input("未提交原因");
    await act(async () => {
      if (method === "escape") {
        document
          .querySelector("textarea")
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
