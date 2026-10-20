import { expect, test } from "vite-plus/test";
import { readWorkshopView, workshopReturnTo } from "./workshopNavigation";

test("workshop address retains independent task pages, project filters and both sort directions", () => {
  const params = new URLSearchParams({
    keyword: "第二话",
    type: "漫画",
    mine: "1",
    taskSort: "DESC",
    sort: "CREATED_ASC",
    page: "4",
    submitPage: "2",
    waitingPage: "3",
  });
  expect(readWorkshopView(new URLSearchParams(params.toString()))).toEqual({
    keyword: "第二话",
    selectedType: "漫画",
    isMyCreated: true,
    taskSort: "DESC",
    sortBy: "CREATED_ASC",
    page: 4,
    submitPage: 2,
    waitingPage: 3,
  });
});

test.each(["0", "-1", "2.5", "9007199254740992", "invalid"])(
  "unusable page %s cannot produce an invalid paginated request",
  (page) => {
    const view = readWorkshopView(
      new URLSearchParams({ page, submitPage: page, waitingPage: page }),
    );
    expect([view.page, view.submitPage, view.waitingPage]).toEqual([1, 1, 1]);
  },
);

test("return context only accepts this application's workshop address", () => {
  expect(workshopReturnTo({ workshopReturnTo: "/dashboard/workshop?submitPage=2" })).toBe(
    "/dashboard/workshop?submitPage=2",
  );
  for (const value of [
    "https://other.example/dashboard/workshop",
    "//other.example",
    "/dashboard/workshop/create",
    {},
    null,
  ]) {
    expect(workshopReturnTo({ workshopReturnTo: value })).toBeUndefined();
  }
});
