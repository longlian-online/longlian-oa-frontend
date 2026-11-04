import { describe, expect, it } from "vite-plus/test";

import { readMemberListFilters } from "./orgAdminListView";

describe("组织成员 URL 条件", () => {
  it("保留已提交关键词、日期和有效排序", () => {
    expect(
      readMemberListFilters(
        new URLSearchParams({
          keyword: "  张三  ",
          startJoinedTime: "2024-02-29",
          endJoinedTime: "2026-01-01",
          orderDir: "ASC",
        }),
      ),
    ).toEqual({
      keyword: "张三",
      startJoinedTime: "2024-02-29",
      endJoinedTime: "2026-01-01",
      orderDir: "ASC",
    });
  });

  it.each(["2026-02-31", "2025-02-29", "not-a-date", "2026-13-01", "2026-01-01T00:00"])(
    "拒绝非法日期 %s",
    (date: string) => {
      expect(
        readMemberListFilters(new URLSearchParams({ startJoinedTime: date, orderDir: "DROP" })),
      ).toEqual({ keyword: "", startJoinedTime: "", endJoinedTime: "", orderDir: "DESC" });
    },
  );

  it("反向日期范围整体回退，不传递非法范围", () => {
    expect(
      readMemberListFilters(
        new URLSearchParams({ startJoinedTime: "2026-06-01", endJoinedTime: "2026-01-01" }),
      ),
    ).toEqual({ keyword: "", startJoinedTime: "", endJoinedTime: "", orderDir: "DESC" });
  });
});
