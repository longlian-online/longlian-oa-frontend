import { expect, test } from "vite-plus/test";

import {
  canEditOrganizationMemberRole,
  isOrganizationManagerRole,
  isOrganizationOwnerRole,
  organizationMemberRoleLabel,
} from "@/lib/organizationRole";

test("owner and admin can enter organization management", (): void => {
  expect(isOrganizationManagerRole("ORG_OWNER")).toBe(true);
  expect(isOrganizationManagerRole(" org_admin ")).toBe(true);
  expect(isOrganizationManagerRole("ORG_USER")).toBe(false);
  expect(isOrganizationManagerRole(null)).toBe(false);
});

test("only an owner can edit another member role", (): void => {
  expect(isOrganizationOwnerRole("ORG_OWNER")).toBe(true);
  expect(canEditOrganizationMemberRole("ORG_OWNER", "ORG_ADMIN")).toBe(true);
  expect(canEditOrganizationMemberRole("ORG_OWNER", "ORG_USER")).toBe(true);
  expect(canEditOrganizationMemberRole("ORG_OWNER", "ORG_OWNER")).toBe(false);
  expect(canEditOrganizationMemberRole("ORG_ADMIN", "ORG_USER")).toBe(false);
  expect(canEditOrganizationMemberRole("ORG_USER", "ORG_ADMIN")).toBe(false);
});

test("member role labels stay distinct", (): void => {
  expect(organizationMemberRoleLabel("ORG_OWNER")).toBe("组织所有者");
  expect(organizationMemberRoleLabel("ORG_ADMIN")).toBe("组织管理员");
  expect(organizationMemberRoleLabel("ORG_USER")).toBe("普通用户");
  expect(organizationMemberRoleLabel(undefined)).toBe("普通用户");
});
