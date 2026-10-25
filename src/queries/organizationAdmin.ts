import {
  getDeletionRequests,
  getJoinApplications,
  getOrganizationBaseTaskList,
  getOrganizationInfo,
  getOrganizationMembers,
  getOrganizationProjects,
  getOrganizationProjectTypes,
  getOrganizationPresetTags,
  getOrganizationTaskTemplate,
  getOrganizationTaskTemplateList,
} from "@/api/organizationAdmin";
import type { ApiQueryOptions } from "@/lib/apiQuery";
import type { MemberListFilters } from "@/pages/dashboard/org-admin/memberListFilters";
import type {
  DeletionRequestVO,
  JoinApplicationVO,
  OrganizationBaseTaskVO,
  OrganizationInfoVO,
  OrganizationMemberVO,
  OrganizationPageResult,
  OrganizationProjectVO,
  OrganizationTaskTemplateDetailVO,
  OrganizationTaskTemplateVO,
  ProjectTypeVO,
  OrganizationPresetTagVO,
} from "@/types/organizationAdmin";

export const ORGANIZATION_ADMIN_PAGE_SIZE = 10;
export const ORGANIZATION_ADMIN_CARD_PAGE_SIZE = 8;

export const INITIAL_MEMBER_LIST_FILTERS: MemberListFilters = {
  keyword: "",
  startJoinedTime: "",
  endJoinedTime: "",
  orderDir: "DESC",
};

export function organizationMembersQuery(
  appliedFilters: MemberListFilters = INITIAL_MEMBER_LIST_FILTERS,
  page = 1,
): ApiQueryOptions<OrganizationPageResult<OrganizationMemberVO>> {
  return {
    key: ["members", "management", appliedFilters, page],
    queryFn: () =>
      getOrganizationMembers({
        pageNum: page,
        pageSize: ORGANIZATION_ADMIN_PAGE_SIZE,
        keyword: appliedFilters.keyword || undefined,
        startJoinedTime: appliedFilters.startJoinedTime || undefined,
        endJoinedTime: appliedFilters.endJoinedTime || undefined,
        orderDir: appliedFilters.orderDir,
      }),
  };
}

export function organizationApplicationsQuery(
  keyword = "",
  page = 1,
): ApiQueryOptions<OrganizationPageResult<JoinApplicationVO>> {
  return {
    key: ["applications", "management", keyword, page],
    queryFn: () =>
      getJoinApplications({
        pageNum: page,
        pageSize: ORGANIZATION_ADMIN_PAGE_SIZE,
        keyword: keyword || undefined,
        orderDir: "DESC",
      }),
  };
}

export function organizationDeletionRequestsQuery(
  page = 1,
): ApiQueryOptions<OrganizationPageResult<DeletionRequestVO>> {
  return {
    key: ["deletionRequests", "management", page],
    queryFn: () => getDeletionRequests(page, ORGANIZATION_ADMIN_PAGE_SIZE),
  };
}

export function organizationProjectTypesQuery(
  keyword = "",
  page = 1,
): ApiQueryOptions<OrganizationPageResult<ProjectTypeVO>> {
  return {
    key: ["projectTypes", "management", keyword, page],
    queryFn: () =>
      getOrganizationProjectTypes({
        keyword: keyword || undefined,
        pageNum: page,
        pageSize: ORGANIZATION_ADMIN_PAGE_SIZE,
        orderDir: "DESC",
      }),
  };
}

export function organizationPresetTagsQuery(
  keyword = "",
  page = 1,
): ApiQueryOptions<OrganizationPageResult<OrganizationPresetTagVO>> {
  return {
    key: ["presetTags", "management", keyword, page],
    queryFn: () =>
      getOrganizationPresetTags({
        keyword: keyword || undefined,
        pageNum: page,
        pageSize: ORGANIZATION_ADMIN_PAGE_SIZE,
        orderDir: "DESC",
      }),
  };
}

export function organizationProjectsQuery(
  keyword = "",
  page = 1,
): ApiQueryOptions<OrganizationPageResult<OrganizationProjectVO>> {
  return {
    key: ["projects", "management", keyword, page],
    queryFn: () =>
      getOrganizationProjects({
        keyword: keyword || undefined,
        pageNum: page,
        pageSize: ORGANIZATION_ADMIN_CARD_PAGE_SIZE,
      }),
  };
}

export function organizationTemplatesQuery(
  keyword = "",
  page = 1,
): ApiQueryOptions<OrganizationPageResult<OrganizationTaskTemplateVO>> {
  const params = { keyword, pageNum: page, pageSize: ORGANIZATION_ADMIN_CARD_PAGE_SIZE };
  return {
    key: ["templates", "management", params],
    queryFn: () => getOrganizationTaskTemplateList(params),
  };
}

export function organizationTemplateBaseTasksQuery(): ApiQueryOptions<
  OrganizationPageResult<OrganizationBaseTaskVO>
> {
  const params = {
    pageNum: 1,
    pageSize: 100,
    status: "ENABLED" as const,
    sortBy: "REF_COUNT" as const,
    orderDir: "DESC" as const,
  };
  return {
    key: ["baseTasks", "options", params],
    queryFn: () => getOrganizationBaseTaskList(params),
    staleTime: 300_000,
  };
}

export function organizationTemplateQuery(
  templateId: string | null,
): ApiQueryOptions<OrganizationTaskTemplateDetailVO> {
  return {
    key: ["templates", "detail", templateId],
    queryFn: () => getOrganizationTaskTemplate(templateId!),
    enabled: Boolean(templateId),
  };
}

export function organizationInfoQuery(): ApiQueryOptions<OrganizationInfoVO> {
  return { key: ["organizationInfo"], queryFn: getOrganizationInfo };
}
