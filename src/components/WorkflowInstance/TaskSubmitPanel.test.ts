import { describe, expect, test } from "vite-plus/test";

import { validateRequiredFields } from "./TaskSubmitPanel";
import type { TaskFormField } from "@/types/task";

describe("task submit validation", () => {
  test("reports empty required text and file fields", () => {
    const fields: TaskFormField[] = [
      { key: "notes", label: "说明", type: "text", required: true, options: [] },
      { key: "deliverable", label: "交付物", type: "file", required: true, options: [] },
    ];

    expect(validateRequiredFields(fields, { notes: "  ", deliverable: null })).toEqual([
      "请填写说明",
      "请填写交付物",
    ]);
  });

  test("accepts zero and file IDs while leaving optional fields empty", () => {
    const fields: TaskFormField[] = [
      { key: "count", label: "数量", type: "number", required: true, options: [] },
      { key: "file", label: "交付物", type: "file", required: true, options: [] },
      { key: "notes", label: "备注", type: "textarea", required: false, options: [] },
    ];
    expect(validateRequiredFields(fields, { count: "0", file: { fileId: "resource-id" } })).toEqual(
      [],
    );
  });

  test("a required file needs a nonempty server file ID", () => {
    const fields: TaskFormField[] = [
      { key: "file", label: "交付物", type: "file", required: true, options: [] },
    ];
    expect(validateRequiredFields(fields, { file: { fileId: " " } })).toEqual(["请填写交付物"]);
  });
});
