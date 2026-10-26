import { request } from "@/api/request";
import type { MemberOption } from "@/types/member";

export async function listMemberOptions(): Promise<MemberOption[]> {
  return request("/members");
}
