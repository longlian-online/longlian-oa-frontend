import type { LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { loader as applications } from "./applications";
import { loader as projects } from "./projects";
import { loader as projectTypes } from "./project-types";
import { loader as fields } from "./preset-fields";
import { loader as tags } from "./preset-tags";
import { loader as templates } from "./workflows/index";
import { loader as members } from "./members";
import { loader as invites } from "./invites";
import { loader as deletions } from "./deletion-requests";

vi.mock("@/lib/routeQuery", () => ({ fetchApiQuery: vi.fn() }));
vi.mock("@/lib/session", () => ({ isOrganizationAdmin: vi.fn(() => true) }));

function args(search: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://oa.example/dashboard/org-admin/projects?${search}`),
    unstable_url: new URL(`https://oa.example/dashboard/org-admin/projects?${search}`),
    unstable_pattern: "/dashboard/org-admin/projects",
    params: {},
    context: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isOrganizationAdmin).mockReturnValue(true);
});

describe("组织管理列表预取", () => {
  it.each([
    [applications, "applications"],
    [projects, "projects"],
    [projectTypes, "projectTypes"],
    [fields, "presetFields"],
    [tags, "presetTags"],
  ] as const)("读取关键词与页码而不是默认条件 %s", async (loader, key) => {
    await loader(args("keyword=%20hello%20&page=3"));
    expect(fetchApiQuery).toHaveBeenCalledOnce();
    expect(vi.mocked(fetchApiQuery).mock.calls[0][0].key).toEqual([key, "management", "hello", 3]);
  });

  it("流程模板的预取条件与 URL 一致", async () => {
    await templates(args("keyword=hello&page=4"));
    expect(vi.mocked(fetchApiQuery).mock.calls[0][0].key).toEqual([
      "templates",
      "management",
      { keyword: "hello", pageNum: 4, pageSize: 8 },
    ]);
  });

  it("成员使用相同的日期和枚举验证", async () => {
    await members(args("keyword=hello&page=2&orderDir=INVALID&startJoinedTime=2026-02-31"));
    expect(vi.mocked(fetchApiQuery).mock.calls[0][0].key).toEqual([
      "members",
      "management",
      { keyword: "hello", orderDir: "DESC", startJoinedTime: "", endJoinedTime: "" },
      2,
    ]);
  });

  it("邀请码保留有效状态，非法状态回退", async () => {
    await invites(args("status=USED&page=3"));
    expect(vi.mocked(fetchApiQuery).mock.calls[0][0].key).toEqual([
      "joinInviteCodes",
      "management",
      "USED",
      3,
    ]);
    await invites(args("status=INVALID&page=0"));
    expect(vi.mocked(fetchApiQuery).mock.calls[1][0].key).toEqual([
      "joinInviteCodes",
      "management",
      "",
      1,
    ]);
  });

  it("注销申请读取页码", async () => {
    await deletions(args("page=5"));
    expect(vi.mocked(fetchApiQuery).mock.calls[0][0].key).toEqual([
      "deletionRequests",
      "management",
      5,
    ]);
  });

  it("非组织管理员不预取", async () => {
    vi.mocked(isOrganizationAdmin).mockReturnValue(false);
    await projects(args("keyword=hello&page=3"));
    expect(fetchApiQuery).not.toHaveBeenCalled();
  });
});
