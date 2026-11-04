import { expect, test } from "vite-plus/test";

import { readPlanningListView, withPlanningListFilters } from "@/lib/planningListView";
import { withPage } from "@/lib/pageQuery";
import { projectListQuery } from "@/queries/planning";

test("无参数与无效参数回退到默认筛选及第一页", (): void => {
  const defaults = {
    pageNum: 1,
    keyword: "",
    selectedType: "all",
    timeSort: { sortByTime: "CREATE", orderDir: "DESC" },
  };
  expect(readPlanningListView(new URLSearchParams())).toEqual(defaults);
  expect(
    readPlanningListView(
      new URLSearchParams("page=-2&keyword=+&projectType=+&sortByTime=invalid&orderDir=invalid"),
    ),
  ).toEqual(defaults);
});

test("解析中文筛选并使请求条件和分页偏移一致", (): void => {
  const view = readPlanningListView(
    new URLSearchParams("page=3&keyword=+百合+&projectType=漫画&sortByTime=UPDATE&orderDir=ASC"),
  );
  expect(view).toEqual({
    pageNum: 3,
    keyword: "百合",
    selectedType: "漫画",
    timeSort: { sortByTime: "UPDATE", orderDir: "ASC" },
  });
  expect(
    projectListQuery(view.pageNum, view.keyword, view.selectedType, view.timeSort).key,
  ).toEqual([
    "projects",
    "list",
    {
      pageNum: 3,
      pageSize: 12,
      offset: 23,
      keyword: "百合",
      projectType: "漫画",
      sortByTime: "UPDATE",
      orderDir: "ASC",
    },
  ]);
});

test("每种筛选更新原子重置页码，翻页保留所有筛选及其他参数", (): void => {
  const params = new URLSearchParams(
    "page=3&keyword=百合&projectType=漫画&sortByTime=UPDATE&orderDir=ASC&extra=keep",
  );
  for (const filters of [
    { keyword: " 新词 " },
    { selectedType: "小说" },
    { timeSort: { sortByTime: "CREATE" as const, orderDir: "DESC" as const } },
  ]) {
    const next = withPlanningListFilters(params, filters);
    expect(next.has("page")).toBe(false);
    expect(next.get("extra")).toBe("keep");
    expect(readPlanningListView(withPage(next, 4))).toEqual({
      ...readPlanningListView(next),
      pageNum: 4,
    });
  }
  expect(params.get("page")).toBe("3");
});

test("清空筛选移除默认参数，保留无关参数", (): void => {
  const params = new URLSearchParams(
    "page=2&keyword=百合&projectType=漫画&orderDir=ASC&extra=keep",
  );
  expect(
    withPlanningListFilters(params, {
      keyword: " ",
      selectedType: "all",
      timeSort: { sortByTime: "CREATE", orderDir: "DESC" },
    }).toString(),
  ).toBe("extra=keep");
});
