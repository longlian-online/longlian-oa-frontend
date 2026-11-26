import { getCurrentUser, getUserOrganizations } from "@/api/user";

import type { ApiQueryOptions } from "@/lib/apiQuery";
import type { OrganizationSimpleInfoVO, UserInfoVO } from "@/types/user";

export const currentUserQuery: ApiQueryOptions<UserInfoVO> = {
  key: ["currentUser"],
  queryFn: getCurrentUser,
  scope: "account",
  staleTime: 300_000,
  refetchOnWindowFocus: false,
};

export const organizationsQuery: ApiQueryOptions<OrganizationSimpleInfoVO[]> = {
  key: ["organizations"],
  queryFn: getUserOrganizations,
  scope: "account",
  staleTime: 300_000,
  refetchOnWindowFocus: false,
};
