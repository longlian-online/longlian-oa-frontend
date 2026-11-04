const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

/** 空白、小数和超出 32 位范围都不是合法优先级。 */
export function readInt32(value: string): number | null {
  const normalized = Number(value);
  if (
    !value.trim() ||
    !Number.isInteger(normalized) ||
    normalized < INT32_MIN ||
    normalized > INT32_MAX
  ) {
    return null;
  }
  return normalized;
}
