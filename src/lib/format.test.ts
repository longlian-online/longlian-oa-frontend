import { describe, expect, test } from "vite-plus/test";

import { formatDate } from "./format";

describe("formatDate", () => {
  test("formats empty and invalid values consistently", () => {
    expect(formatDate()).toBe("—");
    expect(formatDate("invalid")).toBe("invalid");
  });
});
