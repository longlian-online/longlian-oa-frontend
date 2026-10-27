import { expect, test } from "vite-plus/test";

import {
  currentValue,
  formatDisplay,
  isDayDisabled,
  isHourDisabled,
  isMinuteDisabled,
} from "./value";

test("空值显示选择提示，已有值保持原有格式", () => {
  expect(formatDisplay("", "date")).toBe("选择日期");
  expect(formatDisplay("", "datetime")).toBe("选择时间");
  expect(formatDisplay("2026-10-29", "date")).toBe("2026-10-29");
  expect(formatDisplay("2026-10-29T16:45", "datetime")).toBe("2026-10-29 16:45");
});

test("日期和时间的最小最大边界按分钟比较", () => {
  const before = new Date(2026, 9, 28);
  const sameDay = new Date(2026, 9, 29);
  const after = new Date(2026, 9, 30);
  expect(isDayDisabled(before, "datetime", "2026-10-29T16:45", "2026-10-29T18:00")).toBe(true);
  expect(isDayDisabled(sameDay, "datetime", "2026-10-29T16:45", "2026-10-29T18:00")).toBe(false);
  expect(isDayDisabled(after, "datetime", "2026-10-29T16:45", "2026-10-29T18:00")).toBe(true);
  expect(isHourDisabled(sameDay, 15, "datetime", "2026-10-29T16:45", "2026-10-29T18:00")).toBe(
    true,
  );
  expect(isHourDisabled(sameDay, 16, "datetime", "2026-10-29T16:45", "2026-10-29T18:00")).toBe(
    false,
  );
  expect(
    isMinuteDisabled(sameDay, 16, 44, "datetime", "2026-10-29T16:45", "2026-10-29T18:00"),
  ).toBe(true);
  expect(
    isMinuteDisabled(sameDay, 16, 45, "datetime", "2026-10-29T16:45", "2026-10-29T18:00"),
  ).toBe(false);
  expect(isMinuteDisabled(sameDay, 18, 0, "datetime", "2026-10-29T16:45", "2026-10-29T18:00")).toBe(
    false,
  );
  expect(isMinuteDisabled(sameDay, 18, 1, "datetime", "2026-10-29T16:45", "2026-10-29T18:00")).toBe(
    true,
  );
});

test("今天和此刻落在范围外时不可用", () => {
  const now = new Date(2026, 9, 29, 16, 45, 30);
  expect(currentValue("date", "2026-10-30", undefined, now)).toBeNull();
  expect(currentValue("date", undefined, "2026-10-29", now)).toBe("2026-10-29");
  expect(currentValue("datetime", "2026-10-29T16:46", undefined, now)).toBeNull();
  expect(currentValue("datetime", undefined, "2026-10-29T16:45", now)).toBe("2026-10-29T16:45");
  expect(currentValue("datetime", undefined, undefined, now)).toBe("2026-10-29T16:45");
});
