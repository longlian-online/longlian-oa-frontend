import { describe, expect, test } from "vite-plus/test";

import {
  formatProductVersion,
  toProductReleasePayload,
  validateProductRelease,
} from "@/lib/productRelease";

import type { ProductReleaseFormValues } from "@/types/productRelease";

const values: ProductReleaseFormValues = {
  version: " v1.3.0 ",
  frontendVersion: "0.0.18",
  backendVersion: "1.0.52",
  title: " 标题 ",
  summary: "摘要",
  added: "一条新增\n",
  changed: "",
  fixed: "  ",
};

describe("product release form", () => {
  test("formats the product version and strips the stored prefix", () => {
    expect(formatProductVersion("1.3.0")).toBe("v1.3.0");
    expect(formatProductVersion("V1.3.0")).toBe("v1.3.0");
    expect(toProductReleasePayload(values).version).toBe("1.3.0");
    expect(toProductReleasePayload(values).added).toEqual(["一条新增"]);
    expect(toProductReleasePayload(values).fixed).toEqual([]);
  });

  test("requires copy only when publishing", () => {
    expect(validateProductRelease({ ...values, title: " " }, false)).toBeNull();
    expect(validateProductRelease({ ...values, title: " " }, true)).toBe("标题不能为空");
    expect(validateProductRelease({ ...values, version: "1.0" }, false)).toBe("版本格式不正确");
  });
});
