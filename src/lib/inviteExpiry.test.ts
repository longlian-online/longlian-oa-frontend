import { describe, expect, test } from "vite-plus/test";

import { defaultInviteExpiry, toInviteExpiredAt } from "@/lib/inviteExpiry";

const now = new Date(2026, 9, 26, 12, 0, 0);

describe("defaultInviteExpiry", () => {
  test("defaults to the local time 24 hours later", () => {
    expect(defaultInviteExpiry(now)).toBe("2026-10-27T12:00");
  });

  test("handles year rollover and formats minutes with leading zeroes", () => {
    expect(defaultInviteExpiry(new Date(2026, 11, 31, 8, 5, 42))).toBe("2027-01-01T08:05");
  });

  test("uses the supplied current time for each new draft", () => {
    expect(defaultInviteExpiry(new Date(2026, 9, 28, 16, 45))).toBe("2026-10-29T16:45");
  });
});

describe("toInviteExpiredAt", () => {
  test("converts a future local time to the API format", () => {
    expect(toInviteExpiredAt("2026-10-27T18:30", now)).toBe("2026-10-27 18:30:00");
  });

  test.each(["", "2026-10-27", "2026-10-27 18:30:00", "2026-10-26T12:00", "2026-10-26T11:59"])(
    "rejects %s",
    (value) => {
      expect(toInviteExpiredAt(value, now)).toBeNull();
    },
  );
});
