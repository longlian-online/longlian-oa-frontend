import { describe, expect, test } from "vite-plus/test";

import { formatBuildTime, formatBytes, formatDate, formatStorageUsage } from "./format";

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

describe("formatBytes", () => {
  test("keeps byte counts exact and steps units at 1024", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 ** 2)).toBe("1 MB");
    expect(formatBytes(1024 ** 5)).toBe("1 PB");
  });
});

describe("formatStorageUsage", () => {
  test("collapses an empty state and keeps a file with no measured size", () => {
    expect(formatStorageUsage(0, 0)).toBe("0");
    expect(formatStorageUsage(0, Number.NaN)).toBe("0");
    expect(formatStorageUsage(2, 0)).toBe("2 · 0 B");
    expect(formatStorageUsage(1, 1536)).toBe("1 · 1.5 KB");
  });
});
