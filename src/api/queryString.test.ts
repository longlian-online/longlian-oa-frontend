import { expect, test } from "vite-plus/test";

import { withQuery } from "./queryString";

test("空值和空字符串不进入查询串", () => {
  expect(withQuery("/admin/admins/", { pageNum: 1, keyword: "", status: undefined })).toBe(
    "/admin/admins/?pageNum=1",
  );
  expect(withQuery("/admin/admins/", { keyword: "" })).toBe("/admin/admins/");
});
