import { expect, test } from "vite-plus/test";

import { declaredOrganization } from "@/components/layout/OrganizationIdentity";

const organizations = [
  { id: "1", name: "组织1" },
  { id: "2", name: "组织2" },
];

test("shows only the org the client declares", (): void => {
  expect(declaredOrganization(organizations, "2")?.name).toBe("组织2");
});

test("does not fall back to another org when the declared one is missing", (): void => {
  expect(declaredOrganization(organizations, null)).toBeNull();
  expect(declaredOrganization(organizations, "9")).toBeNull();
});
