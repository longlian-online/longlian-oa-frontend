import { expect, test } from "vite-plus/test";

import { commitMemberListFilters, type MemberListFilters } from "./memberListFilters";

const applied: MemberListFilters = {
  keyword: "岚",
  startJoinedTime: "2026-01-01",
  endJoinedTime: "2026-02-01",
  orderDir: "DESC",
};

test("仅空白变化不提交查询", () => {
  expect(commitMemberListFilters(applied, { ...applied, keyword: "  岚  " })).toBeNull();
  expect(commitMemberListFilters(applied, applied)).toBeNull();
});

test("关键词、日期和排序变化提交修剪后的条件", () => {
  expect(commitMemberListFilters(applied, { ...applied, keyword: " 阿岚 " })).toEqual({
    ...applied,
    keyword: "阿岚",
  });
  expect(
    commitMemberListFilters(applied, { ...applied, endJoinedTime: "2026-03-01" })?.endJoinedTime,
  ).toBe("2026-03-01");
  expect(commitMemberListFilters(applied, { ...applied, orderDir: "ASC" })?.orderDir).toBe("ASC");
});
