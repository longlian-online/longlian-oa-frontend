import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/api/request", () => ({ request }));

import { getTaskPlaza } from "@/api/plaza";

describe("plaza api", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ list: [], total: 0 });
  });

  test("builds the default plaza query", async () => {
    await getTaskPlaza({ pageNum: 1, pageSize: 8 });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/task/instance/plaza?pageNum=1&pageSize=8");
  });

  test("passes keyword, project type and sort", async () => {
    await getTaskPlaza({
      keyword: "第05话",
      projectType: "漫画",
      sortBy: "MOST",
      pageNum: 2,
      pageSize: 8,
    });

    expect(request).toHaveBeenCalledWith(
      "/task/instance/plaza?keyword=%E7%AC%AC05%E8%AF%9D&projectType=%E6%BC%AB%E7%94%BB&sortBy=MOST&pageNum=2&pageSize=8",
    );
  });

  test("omits empty optional filters", async () => {
    await getTaskPlaza({ pageNum: 1, pageSize: 8, keyword: "", projectType: undefined });

    expect(request).toHaveBeenCalledWith("/task/instance/plaza?pageNum=1&pageSize=8");
  });
});
