import { readListQuery } from "@/lib/listQueryState";
import type { MemberListFilters } from "./memberListFilters";

export const MEMBER_LIST_DEFAULTS: MemberListFilters = {
  keyword: "",
  startJoinedTime: "",
  endJoinedTime: "",
  orderDir: "DESC",
};
export const MEMBER_LIST_CHOICES = { orderDir: ["ASC", "DESC"] } as const;

function validDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

export function readMemberListFilters(params: URLSearchParams): MemberListFilters {
  const filters = readListQuery(params, MEMBER_LIST_DEFAULTS, MEMBER_LIST_CHOICES);
  const startJoinedTime = validDate(filters.startJoinedTime);
  const endJoinedTime = validDate(filters.endJoinedTime);
  const reversed = Boolean(startJoinedTime && endJoinedTime && startJoinedTime > endJoinedTime);
  return {
    ...filters,
    startJoinedTime: reversed ? "" : startJoinedTime,
    endJoinedTime: reversed ? "" : endJoinedTime,
  };
}
