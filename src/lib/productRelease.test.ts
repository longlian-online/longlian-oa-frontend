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
  content: "  # 更新\n\n- 一条新增  ",
};

describe("product release form", () => {
  test("formats the product version and strips the stored prefix", () => {
    expect(formatProductVersion("1.3.0")).toBe("v1.3.0");
    expect(formatProductVersion("V1.3.0")).toBe("v1.3.0");
    expect(toProductReleasePayload(values).version).toBe("1.3.0");
    expect(toProductReleasePayload(values).content).toBe("# 更新\n\n- 一条新增");
  });

  test("requires copy only when publishing", () => {
    expect(validateProductRelease({ ...values, title: " " }, false)).toBeNull();
    expect(validateProductRelease({ ...values, title: " " }, true)).toBe("标题不能为空");
    expect(validateProductRelease({ ...values, content: " " }, true)).toBe("更新说明不能为空");
    expect(validateProductRelease({ ...values, version: "1.0" }, false)).toBe("版本格式不正确");
  });
});
