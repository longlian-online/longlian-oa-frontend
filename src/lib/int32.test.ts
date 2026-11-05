import { expect, test } from "vite-plus/test";

import { readInt32 } from "./int32";

test("接受 32 位整数并拒绝空白、小数和越界值", () => {
  expect(readInt32("0")).toBe(0);
  expect(readInt32("-2147483648")).toBe(-2147483648);
  expect(readInt32("2147483647")).toBe(2147483647);
  expect(readInt32("  ")).toBeNull();
  expect(readInt32("1.5")).toBeNull();
  expect(readInt32("2147483648")).toBeNull();
});
