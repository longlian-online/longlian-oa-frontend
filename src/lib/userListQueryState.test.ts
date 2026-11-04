import { expect, test } from "vite-plus/test";

import { readListQuery, withListQuery } from "./listQueryState";
import { readPage, withPage } from "./pageQuery";
import {
  plazaListChoices,
  plazaListDefaults,
  plazaPageKeys,
  plazaTaskPageKey,
} from "./plazaListQueryState";
import { projectItemsDefaults, readProjectItemsStatus } from "./projectItemsListQuery";

test("project item ALL deep links and switching serialize the sentinel but send an empty API status", () => {
  expect(readProjectItemsStatus(new URLSearchParams("status=ALL&page=3"))).toBe("");
  const params = withListQuery(new URLSearchParams("page=3&other=keep"), projectItemsDefaults, {
    status: "ALL",
  });
  expect(params.get("status")).toBe("ALL");
  expect(readProjectItemsStatus(params)).toBe("");
  expect(params.has("page")).toBe(false);
  expect(params.get("other")).toBe("keep");
  expect(readProjectItemsStatus(new URLSearchParams())).toBe("IN_PROGRESS");
  expect(readProjectItemsStatus(new URLSearchParams("status=invalid"))).toBe("IN_PROGRESS");
  const completed = withListQuery(params, projectItemsDefaults, { status: "COMPLETED" });
  expect(readProjectItemsStatus(completed)).toBe("COMPLETED");
  const reset = withListQuery(completed, projectItemsDefaults, { status: "IN_PROGRESS" });
  expect(reset.has("status")).toBe(false);
  expect(readProjectItemsStatus(reset)).toBe("IN_PROGRESS");
});

test("plaza group pages are independent and filtering clears every group page atomically", () => {
  const first = plazaTaskPageKey("21");
  const second = plazaTaskPageKey("22");
  const initial = new URLSearchParams({
    page: "4",
    [first]: "2",
    [second]: "3",
    unrelated: "keep",
  });
  const paged = withPage(initial, 4, first);
  expect(readPage(paged, first)).toBe(4);
  expect(readPage(paged, second)).toBe(3);
  expect(readPage(paged)).toBe(4);
  const filtered = withListQuery(
    paged,
    plazaListDefaults,
    { keyword: "new" },
    plazaPageKeys(paged),
  );
  expect(filtered.get("keyword")).toBe("new");
  expect(filtered.has(first)).toBe(false);
  expect(filtered.has(second)).toBe(false);
  expect(filtered.has("page")).toBe(false);
  expect(filtered.get("unrelated")).toBe("keep");
});

test("plaza URL enums fall back to supported defaults", () => {
  const filters = readListQuery(
    new URLSearchParams("sortBy=bad&stageScope=bad&keyword=%20term%20"),
    plazaListDefaults,
    plazaListChoices,
  );
  expect(filters.sortBy).toBe(plazaListDefaults.sortBy);
  expect(filters.stageScope).toBe("ALL");
  expect(filters.keyword).toBe("term");
});
