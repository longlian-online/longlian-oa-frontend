import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/api/request", () => ({ request }));

import { getCurrentUser, getUserOrganizations, updateMyInfo } from "@/api/user";

describe("user API transport", () => {
  beforeEach((): void => {
    request.mockReset();
  });
  test("organization reads do not create a second API cache", async (): Promise<void> => {
    request
      .mockResolvedValueOnce([{ id: "11", name: "before" }])
      .mockResolvedValueOnce([{ id: "22", name: "after" }]);
    expect(await getUserOrganizations()).toEqual([{ id: "11", name: "before" }]);
    expect(await getUserOrganizations()).toEqual([{ id: "22", name: "after" }]);
    expect(request).toHaveBeenCalledTimes(2);
  });
  test("profile updates and fresh reads keep their original API protocol", async (): Promise<void> => {
    request
      .mockResolvedValueOnce({ username: "before" })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ username: "after" });
    expect((await getCurrentUser()).username).toBe("before");
    await updateMyInfo({ nickname: "更新后的昵称" });
    expect((await getCurrentUser()).username).toBe("after");
    expect(request).toHaveBeenNthCalledWith(2, "/user/", {
      method: "PUT",
      body: JSON.stringify({ nickname: "更新后的昵称" }),
    });
  });
});
