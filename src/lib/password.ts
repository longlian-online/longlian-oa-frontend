import * as z from "zod";

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 20;

export const NEW_PASSWORD_HINT = "6-20 位，需同时包含大写字母、小写字母和数字";

const PASSWORD_TOO_SHORT = "密码至少6个字符";
const PASSWORD_TOO_LONG = "密码最多20个字符";

/**
 * 设置新密码时的失败原因。登录和校验原密码不要用这个函数。
 * 空字符串按长度不足处理，与原来的最少 6 位提示一致。
 */
export function newPasswordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_TOO_SHORT;
  if (password.length > PASSWORD_MAX_LENGTH) return PASSWORD_TOO_LONG;

  const missing: string[] = [];
  if (!/[A-Z]/.test(password)) missing.push("大写字母");
  if (!/[a-z]/.test(password)) missing.push("小写字母");
  if (!/[0-9]/.test(password)) missing.push("数字");
  if (missing.length === 0) return null;
  return `密码必须包含${missing.join("、")}`;
}

export const newPasswordSchema = z.string().superRefine((value, ctx) => {
  const message = newPasswordError(value);
  if (!message) return;
  ctx.addIssue({ code: z.ZodIssueCode.custom, message });
});
