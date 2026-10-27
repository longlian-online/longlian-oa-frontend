// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import DateTimeField from "./index";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 29, 16, 45, 30));
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.useRealTimers();
});

function renderField(props: {
  mode: "date" | "datetime";
  value?: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}): void {
  act(() => root?.unmount());
  container?.remove();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <DateTimeField
        mode={props.mode}
        value={props.value ?? ""}
        min={props.min}
        max={props.max}
        onChange={props.onChange}
      />,
    );
  });
}

function dayButton(day: string): HTMLButtonElement {
  const found = document.querySelector(`[data-day="${day}"]`)?.querySelector("button");
  if (!(found instanceof HTMLButtonElement)) throw new Error(`缺少日期 ${day}`);
  return found;
}

function dayDisabled(day: string): boolean {
  return document.querySelector(`[data-day="${day}"]`)?.hasAttribute("data-disabled") === true;
}

function timeButton(label: "时" | "分", value: string): HTMLButtonElement {
  const list = document.querySelector(`[aria-label="${label}"]`);
  const found = [...(list?.querySelectorAll("button") ?? [])].find(
    (button) => button.textContent === value,
  );
  if (!(found instanceof HTMLButtonElement)) throw new Error(`缺少${label} ${value}`);
  return found;
}

function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent?.trim() === label,
  );
  if (!(found instanceof HTMLButtonElement)) throw new Error(`缺少按钮 ${label}`);
  return found;
}

test("仅日期点选后写入日期并关闭，清空后为空", async () => {
  const values: string[] = [];
  renderField({ mode: "date", onChange: (value) => values.push(value) });
  expect(button("选择日期")).toBeDefined();
  await act(async () => button("选择日期").click());
  await act(async () => dayButton("2026-10-02").click());
  expect(values).toEqual(["2026-10-02"]);
  expect(document.querySelector("[data-slot='calendar']")).toBeNull();

  renderField({
    mode: "date",
    value: "2026-10-02",
    onChange: (value) => values.push(value),
  });
  await act(async () => button("2026-10-02").click());
  await act(async () => button("清空").click());
  expect(values.at(-1)).toBe("");
});

test("日期时间确定后写入分钟精度，范围外的日期不可选", async () => {
  const values: string[] = [];
  renderField({
    mode: "datetime",
    min: "2026-10-29T16:45",
    max: "2026-10-29T18:00",
    onChange: (value) => values.push(value),
  });
  await act(async () => button("选择时间").click());
  expect(dayDisabled("2026-10-28")).toBe(true);
  expect(dayDisabled("2026-10-30")).toBe(true);
  expect(button("确定").disabled).toBe(true);
  await act(async () => dayButton("2026-10-29").click());
  expect(timeButton("时", "15").disabled).toBe(true);
  await act(async () => timeButton("时", "16").click());
  expect(timeButton("分", "44").disabled).toBe(true);
  await act(async () => timeButton("分", "45").click());
  await act(async () => button("确定").click());
  expect(values).toEqual(["2026-10-29T16:45"]);
  expect(document.querySelector("[data-slot='calendar']")).toBeNull();
});
