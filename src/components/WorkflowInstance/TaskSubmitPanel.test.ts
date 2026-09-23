import { describe, expect, test } from "vite-plus/test";

import { validateRequiredFields, type MetaFieldSchema } from "./TaskSubmitPanel";

describe("task submit validation", () => {
  test("reports empty required text and file fields", () => {
    const fields: MetaFieldSchema[] = [
      { name: "说明", required: true },
      { name: "交付物", fieldType: "file", required: true },
    ];

    expect(validateRequiredFields(fields, { 说明: "  ", 交付物: null })).toEqual([
      "请填写说明",
      "请填写交付物",
    ]);
  });
});
