import { expect, test } from "vite-plus/test";

import { commitWorkloadFilters, type WorkloadFilters } from "./workloadFilters";

const applied: WorkloadFilters = { keyword: "岚", orderDir: "DESC" };

test("仅空白变化不提交查询", () => {
  expect(commitWorkloadFilters(applied, { ...applied, keyword: "  岚  " })).toBeNull();
});

test("关键词和排序变化提交修剪后的条件", () => {
  expect(commitWorkloadFilters(applied, { ...applied, keyword: " 阿岚 " })).toEqual({
    keyword: "阿岚",
    orderDir: "DESC",
  });
  expect(commitWorkloadFilters(applied, { ...applied, orderDir: "ASC" })?.orderDir).toBe("ASC");
});
