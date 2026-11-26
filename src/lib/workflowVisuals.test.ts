import { describe, expect, test, vi } from "vite-plus/test";
import { Anchor, Camera, Languages, Star } from "lucide-react";

vi.mock("@/lib/lucideIconCatalog", () => ({
  loadLucideIconCatalog: vi.fn(async () => ({ Anchor, Camera })),
}));

import {
  getWorkflowTaskIcon,
  needsDynamicWorkflowIcon,
  resolveWorkflowTaskIcon,
} from "./workflowVisuals";

describe("workflow task icons", () => {
  test("uses a selected common Lucide icon synchronously ahead of the task name", () => {
    expect(getWorkflowTaskIcon("普通任务", "Camera")).toBe(Camera);
    expect(getWorkflowTaskIcon("翻译任务", "Camera")).toBe(Camera);
    expect(needsDynamicWorkflowIcon("Camera")).toBe(false);
  });

  test("resolves uncommon Lucide icons on demand without blocking initial fallback", async () => {
    expect(needsDynamicWorkflowIcon("Anchor")).toBe(true);
    expect(getWorkflowTaskIcon("普通任务", "Anchor")).toBe(Star);
    await expect(resolveWorkflowTaskIcon("普通任务", "Anchor")).resolves.toBe(Anchor);
    expect(getWorkflowTaskIcon("普通任务", "Anchor")).toBe(Anchor);
  });

  test("falls back to the task name when no usable icon is saved", async () => {
    expect(getWorkflowTaskIcon("翻译任务")).toBe(Languages);
    expect(getWorkflowTaskIcon("翻译任务", "")).toBe(Languages);
    expect(getWorkflowTaskIcon("翻译任务", "NotAnIcon")).toBe(Languages);
    expect(getWorkflowTaskIcon("普通任务")).toBe(Star);
    expect(getWorkflowTaskIcon("普通任务", "")).toBe(Star);
    expect(getWorkflowTaskIcon("普通任务", "NotAnIcon")).toBe(Star);
    await expect(resolveWorkflowTaskIcon("翻译任务", "NotAnIcon")).resolves.toBe(Languages);
  });

  test("rejects prototype keys and uses the name fallback", async () => {
    expect(needsDynamicWorkflowIcon("constructor")).toBe(false);
    expect(needsDynamicWorkflowIcon("toString")).toBe(false);
    expect(getWorkflowTaskIcon("普通任务", "constructor")).toBe(Star);
    expect(getWorkflowTaskIcon("普通任务", "toString")).toBe(Star);
    expect(getWorkflowTaskIcon("翻译任务", "constructor")).toBe(Languages);
    expect(getWorkflowTaskIcon("翻译任务", "toString")).toBe(Languages);
    await expect(resolveWorkflowTaskIcon("普通任务", "constructor")).resolves.toBe(Star);
  });
});
