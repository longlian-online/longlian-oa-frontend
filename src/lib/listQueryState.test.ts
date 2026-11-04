import { expect, test } from "vite-plus/test";
import { readListQuery, withListQuery } from "@/lib/listQueryState";

const defaults = { keyword: "", status: "ALL", orderDir: "DESC" };
const choices = { status: ["ALL", "ACTIVE", "DISABLED"], orderDir: ["ASC", "DESC"] };

test("URL 解析统一处理缺省、空白、中文和无效枚举", (): void => {
  expect(readListQuery(new URLSearchParams(), defaults, choices)).toEqual(defaults);
  expect(
    readListQuery(
      new URLSearchParams("keyword=+百合+&status=invalid&orderDir=ASC"),
      defaults,
      choices,
    ),
  ).toEqual({
    keyword: "百合",
    status: "ALL",
    orderDir: "ASC",
  });
  expect(
    readListQuery(new URLSearchParams("keyword=+&status=+&orderDir=invalid"), defaults, choices),
  ).toEqual(defaults);
});

test("筛选与关联分页一次性更新，未改动条件、其他分页和未知参数不丢失", (): void => {
  const params = new URLSearchParams(
    "page=4&submitPage=3&waitingPage=2&keyword=旧词&status=ACTIVE&view=about",
  );
  const next = withListQuery(params, defaults, { keyword: " 新词 " });
  expect(next.has("page")).toBe(false);
  expect(readListQuery(next, defaults, choices)).toEqual({
    keyword: "新词",
    status: "ACTIVE",
    orderDir: "DESC",
  });
  expect(next.get("submitPage")).toBe("3");
  expect(next.get("waitingPage")).toBe("2");
  expect(next.get("view")).toBe("about");
  expect(params.get("page")).toBe("4");
  const tasks = withListQuery(params, defaults, { orderDir: "ASC" }, ["submitPage", "waitingPage"]);
  expect(tasks.get("page")).toBe("4");
  expect(tasks.has("submitPage")).toBe(false);
  expect(tasks.has("waitingPage")).toBe(false);
});

test("默认筛选和空关键词不写入 URL，清空后仍能正确解析", (): void => {
  const next = withListQuery(
    new URLSearchParams("page=5&keyword=旧词&status=ACTIVE&orderDir=ASC"),
    defaults,
    defaults,
  );
  expect(next.toString()).toBe("");
  expect(readListQuery(next, defaults, choices)).toEqual(defaults);
});
