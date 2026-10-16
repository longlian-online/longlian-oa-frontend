export function isOrganizationManagerRole(role: string | null | undefined): boolean {
  const normalized = role?.trim().toUpperCase();
  return normalized === "ORG_ADMIN" || normalized === "ORG_OWNER";
}

export function isOrganizationOwnerRole(role: string | null | undefined): boolean {
  return role?.trim().toUpperCase() === "ORG_OWNER";
}

export function organizationMemberRoleLabel(role: string | null | undefined): string {
  const normalized = role?.trim().toUpperCase();
  if (normalized === "ORG_OWNER") return "组织所有者";
  if (normalized === "ORG_ADMIN") return "组织管理员";
  return "普通用户";
}

export function canEditOrganizationMemberRole(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined,
): boolean {
  return isOrganizationOwnerRole(actorRole) && !isOrganizationOwnerRole(targetRole);
}
