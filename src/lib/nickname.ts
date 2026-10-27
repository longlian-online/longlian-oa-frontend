export const NICKNAME_MAX_LENGTH = 20;

const NICKNAME_REQUIRED = "昵称不能为空";
const NICKNAME_TOO_LONG = "昵称最多20个字符";

/**
 * 与注册页相同：先看原始长度，再拒绝空字符串和纯空白。
 * 通过时返回 null，调用方提交前再去掉首尾空白。
 */
export function nicknameFieldError(value: string): string | null {
  if (value.length > NICKNAME_MAX_LENGTH) return NICKNAME_TOO_LONG;
  if (value.trim().length === 0) return NICKNAME_REQUIRED;
  return null;
}

export function normalizeNickname(value: string): string {
  return value.trim();
}
