import { describe, expect, test } from "vite-plus/test";
import { icons, Languages, Star } from "lucide-react";

import { getWorkflowTaskIcon } from "./workflowVisuals";

describe("workflow task icons", () => {
  test("uses a selected Lucide icon ahead of the task name", () => {
    expect(getWorkflowTaskIcon("普通任务", "Camera")).toBe(icons.Camera);
    expect(getWorkflowTaskIcon("翻译任务", "Camera")).toBe(icons.Camera);
  });

  test("falls back to the task name when no usable icon is saved", () => {
    expect(getWorkflowTaskIcon("翻译任务")).toBe(Languages);
    expect(getWorkflowTaskIcon("翻译任务", "")).toBe(Languages);
    expect(getWorkflowTaskIcon("翻译任务", "NotAnIcon")).toBe(Languages);
    expect(getWorkflowTaskIcon("普通任务")).toBe(Star);
    expect(getWorkflowTaskIcon("普通任务", "")).toBe(Star);
    expect(getWorkflowTaskIcon("普通任务", "NotAnIcon")).toBe(Star);
  });

  test("rejects prototype keys and uses the name fallback", () => {
    expect(getWorkflowTaskIcon("普通任务", "constructor")).toBe(Star);
    expect(getWorkflowTaskIcon("普通任务", "toString")).toBe(Star);
    expect(getWorkflowTaskIcon("翻译任务", "constructor")).toBe(Languages);
    expect(getWorkflowTaskIcon("翻译任务", "toString")).toBe(Languages);
  });
});
