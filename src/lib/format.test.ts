import { describe, expect, test } from "vite-plus/test";

import { formatBuildTime, formatDate } from "./format";

describe("formatDate", () => {
  test("formats empty and invalid values consistently", () => {
    expect(formatDate()).toBe("—");
    expect(formatDate("invalid")).toBe("invalid");
  });
});

describe("formatBuildTime", () => {
  test("formats local time to minute precision", () => {
    const time = new Date(2026, 9, 19, 10, 30, 59).toISOString();
    expect(formatBuildTime(time)).toBe("2026-10-19 10:30");
  });

  test("formats local midnight as 00:00", () => {
    const midnight = new Date(2026, 9, 19, 0, 0).toISOString();
    expect(formatBuildTime(midnight)).toBe("2026-10-19 00:00");
  });

  test.each([undefined, null, "", "   ", "invalid"])("shows unknown for %s", (value) => {
    expect(formatBuildTime(value)).toBe("未知");
  });
});
