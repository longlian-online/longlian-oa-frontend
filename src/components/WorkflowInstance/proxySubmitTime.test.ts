import { describe, expect, test } from "vite-plus/test";

import { toDateTimeLocalValue, toSubmitTimestamp } from "./proxySubmitTime";

describe("proxy submit time", () => {
  const now = new Date(2026, 9, 26, 12, 0, 0);

  test("formats the chosen local time instead of the current time", () => {
    expect(toSubmitTimestamp("2026-10-01T09:30", now)).toBe("2026-10-01 09:30:00");
    expect(toSubmitTimestamp("2026-10-01T09:30:05", now)).toBe("2026-10-01 09:30:05");
    expect(toDateTimeLocalValue(now)).toBe("2026-10-26T12:00");
  });

  test("rejects empty, invalid and future times", () => {
    expect(toSubmitTimestamp("", now)).toBeNull();
    expect(toSubmitTimestamp("2026-10-01", now)).toBeNull();
    expect(toSubmitTimestamp("2026-10-26T12:00:01", now)).toBeNull();
    expect(toSubmitTimestamp("2026-10-26T12:00:00", now)).toBe("2026-10-26 12:00:00");
  });
});
