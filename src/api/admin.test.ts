import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import {
  changeAdminOrganizationStatus,
  createAdmin,
  createOrganizationInviteCode,
  getAdminList,
  getAdminOrganizations,
  getScheduledTasks,
  triggerScheduledTask,
} from "@/api/admin";

const { adminRequest } = vi.hoisted(() => ({ adminRequest: vi.fn() }));

vi.mock("@/api/request", () => ({
  adminRequest,
}));

describe("admin api", () => {
  beforeEach(() => {
    adminRequest.mockReset();
    adminRequest.mockResolvedValue(undefined);
  });

  test("queries administrators with pagination", async () => {
    await getAdminList({ pageNum: 2, pageSize: 20 });

    expect(adminRequest).toHaveBeenCalledWith("/admin/admins/?pageNum=2&pageSize=20");
  });

  test("creates an administrator with the request body", async () => {
    await createAdmin({ username: "ops", password: "secret123" });

    expect(adminRequest).toHaveBeenCalledWith("/admin/admins/", {
      method: "POST",
      body: JSON.stringify({ username: "ops", password: "secret123" }),
    });
  });

  test("changes organization status and triggers a scheduled task", async () => {
    await changeAdminOrganizationStatus("org-1", "DISABLED");
    await triggerScheduledTask("cleanup", { executeTime: "2026-09-19T00:00:00Z" });

    expect(adminRequest).toHaveBeenNthCalledWith(1, "/admin/organizations/org-1/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "DISABLED" }),
    });
    expect(adminRequest).toHaveBeenNthCalledWith(2, "/admin/scheduled-tasks/cleanup/trigger", {
      method: "POST",
      body: JSON.stringify({ executeTime: "2026-09-19T00:00:00Z" }),
    });
  });

  test("uses the correct endpoints for list and invite operations", async () => {
    await getAdminOrganizations({ orgName: "测试", pageNum: 1, pageSize: 10 });
    await createOrganizationInviteCode();
    await getScheduledTasks();

    expect(adminRequest).toHaveBeenNthCalledWith(
      1,
      "/admin/organizations/?orgName=%E6%B5%8B%E8%AF%95&pageNum=1&pageSize=10",
    );
    expect(adminRequest).toHaveBeenNthCalledWith(
      2,
      "/admin/organizations/invite-codes/create-org",
      {
        method: "POST",
      },
    );
    expect(adminRequest).toHaveBeenNthCalledWith(3, "/admin/scheduled-tasks/");
  });
});
