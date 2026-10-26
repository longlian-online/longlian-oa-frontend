import { describe, expect, test } from "vite-plus/test";

import { toInviteExpiredAt } from "@/lib/inviteExpiry";

const now = new Date(2026, 9, 26, 12, 0, 0);

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
