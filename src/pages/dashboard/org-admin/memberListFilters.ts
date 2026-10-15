import type { OrganizationMemberListDTO } from "@/types/organizationAdmin";

export const MEMBER_SEARCH_DEBOUNCE_MS = 300;

export type MemberListFilters = {
  keyword: string;
  startJoinedTime: string;
  endJoinedTime: string;
  orderDir: NonNullable<OrganizationMemberListDTO["orderDir"]>;
};

/** 草稿与已提交条件一致时返回 null，避免空白键入重置页码并重复请求。 */
export function commitMemberListFilters(
  applied: MemberListFilters,
  draft: MemberListFilters,
): MemberListFilters | null {
  const next: MemberListFilters = { ...draft, keyword: draft.keyword.trim() };
  if (
    applied.keyword === next.keyword &&
    applied.startJoinedTime === next.startJoinedTime &&
    applied.endJoinedTime === next.endJoinedTime &&
    applied.orderDir === next.orderDir
  ) {
    return null;
  }
  return next;
}
