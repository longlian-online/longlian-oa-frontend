import { describe, expect, test } from "vite-plus/test";

import { newPasswordError, newPasswordSchema } from "./password";

describe("newPasswordError", () => {
  test("keeps the 6 and 20 character bounds", () => {
    expect(newPasswordError("Ab1")).toBe("密码至少6个字符");
    expect(newPasswordError("")).toBe("密码至少6个字符");
    expect(newPasswordError("Abcdef1Abcdef1Abcdef1")).toBe("密码最多20个字符");
  });

  test("names every missing character class", () => {
    expect(newPasswordError("123456")).toBe("密码必须包含大写字母、小写字母");
    expect(newPasswordError("password")).toBe("密码必须包含大写字母、数字");
    expect(newPasswordError("PASSWORD")).toBe("密码必须包含小写字母、数字");
    expect(newPasswordError("Password")).toBe("密码必须包含数字");
    expect(newPasswordError("abcdef1")).toBe("密码必须包含大写字母");
    expect(newPasswordError("ABCDEF1")).toBe("密码必须包含小写字母");
  });

  test("accepts boundaries that include upper, lower, and digit", () => {
    expect(newPasswordError("Ab1cde")).toBeNull();
    expect(newPasswordError("x7!Q2z")).toBeNull();
    expect(newPasswordError("GoodPass1")).toBeNull();
    expect(newPasswordError("x7!Q2z9@Lm4#Rt8$Vb6%")).toBeNull();
  });

  test("schema reports the same reason and does not trim spaces", () => {
    expect(newPasswordSchema.safeParse(" password ").success).toBe(false);
    expect(newPasswordSchema.safeParse(" password ").error?.issues[0]?.message).toBe(
      "密码必须包含大写字母、数字",
    );
    expect(newPasswordSchema.safeParse("Ab1cde").success).toBe(true);
  });
});
