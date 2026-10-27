import { expect, test } from "vite-plus/test";

import { nicknameFieldError, normalizeNickname } from "./nickname";

test("rejects an empty or whitespace nickname before submit", () => {
  expect(nicknameFieldError("")).toBe("昵称不能为空");
  expect(nicknameFieldError("   ")).toBe("昵称不能为空");
  expect(nicknameFieldError("\n\t")).toBe("昵称不能为空");
});

test("rejects more than 20 characters using the raw value", () => {
  expect(nicknameFieldError("名".repeat(21))).toBe("昵称最多20个字符");
  expect(nicknameFieldError(` ${"a".repeat(20)}`)).toBe("昵称最多20个字符");
});

test("accepts a 20 character nickname and trims surrounding spaces", () => {
  expect(nicknameFieldError("名".repeat(20))).toBeNull();
  expect(nicknameFieldError("  小明  ")).toBeNull();
  expect(normalizeNickname("  小明  ")).toBe("小明");
});
