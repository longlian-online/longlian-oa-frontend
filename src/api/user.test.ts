import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
const { getUserId } = vi.hoisted(() => ({ getUserId: vi.fn() }));

vi.mock("@/api/request", () => ({ request }));
vi.mock("@/lib/session", () => ({ getUserId }));

import { getCurrentUser, getUserOrganizations, updateMyInfo } from "@/api/user";

describe("user api cache", () => {
  let userIndex = 0;

  beforeEach(() => {
    userIndex += 1;
    request.mockReset();
    getUserId.mockReturnValue(`user-${userIndex}`);
  });

  test("reuses the organization list for the current user", async () => {
    request.mockResolvedValue([{ id: "org-1", name: "测试组织" }]);

    await getUserOrganizations();
    await getUserOrganizations();

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/user/organizations");
  });

  test("invalidates the current user cache after updating profile", async () => {
    request
      .mockResolvedValueOnce({ id: "user-1", username: "before", email: "before@example.com" })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "user-1", username: "after", email: "after@example.com" });

    expect((await getCurrentUser()).username).toBe("before");
    await updateMyInfo({ nickname: "更新后的昵称" });
    expect((await getCurrentUser()).username).toBe("after");

    expect(request).toHaveBeenCalledTimes(3);
  });
});
