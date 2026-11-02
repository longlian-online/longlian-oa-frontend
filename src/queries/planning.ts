import {
  getPresetFields,
  getPresetTags,
  getProjectDetail,
  getProjectList,
  getProjectTypes,
} from "@/api/planning";
import { getPlazaTaskTypes, getTaskPlaza } from "@/api/plaza";
import { getProjectItemList, getTaskTemplateOptions } from "@/api/projectItem";
import { getItemTaskFlow, getItemTaskInstances } from "@/api/workflowInstance";

import type { ApiQueryOptions } from "@/lib/apiQuery";
import type { TaskTemplateOptionVO } from "@/types/projectItem";
import type {
  PageResult,
  ProjectDetailInfoVO,
  ProjectInfoVO,
  ProjectListDTO,
  PresetFieldVO,
  ProjectTypeInfoVO,
  PresetTagVO,
} from "@/types/planning";
import type { PlazaProjectGroup, PlazaSortBy, PlazaTaskTypeOption } from "@/types/plaza";
import type { ProjectItemListFilter, ProjectItemListVO } from "@/types/projectItem";
import type { ItemTaskFlowVO, ItemTaskInstanceVO } from "@/types/workflowInstance";

export const PLANNING_PAGE_SIZE = 12;
export const PROJECT_ITEMS_PAGE_SIZE = 4;
export const PLAZA_PAGE_SIZE = 8;
export const DEFAULT_PROJECT_TIME_SORT: Required<Pick<ProjectListDTO, "sortByTime" | "orderDir">> =
  {
    sortByTime: "CREATE",
    orderDir: "DESC",
  };
export const DEFAULT_PLAZA_SORT: PlazaSortBy = "WAIT";

export function projectTypesQuery(): ApiQueryOptions<ProjectTypeInfoVO[]> {
  return { key: ["projectTypes"], queryFn: getProjectTypes, staleTime: 300_000 };
}

export function presetTagsQuery(): ApiQueryOptions<PresetTagVO[]> {
  return { key: ["presetTags"], queryFn: getPresetTags, staleTime: 300_000 };
}

export function presetFieldsQuery(): ApiQueryOptions<PresetFieldVO[]> {
  return { key: ["presetFields"], queryFn: getPresetFields, staleTime: 300_000 };
}

export function projectListQuery(
  pageNum = 1,
  keyword = "",
  selectedType = "all",
  timeSort = DEFAULT_PROJECT_TIME_SORT,
): ApiQueryOptions<PageResult<ProjectInfoVO>> {
  const params = {
    pageNum,
    pageSize: pageNum === 1 ? PLANNING_PAGE_SIZE - 1 : PLANNING_PAGE_SIZE,
    offset: pageNum === 1 ? undefined : PLANNING_PAGE_SIZE - 1 + (pageNum - 2) * PLANNING_PAGE_SIZE,
    keyword: keyword || undefined,
    projectType: selectedType === "all" ? undefined : selectedType,
    ...timeSort,
  };
  return { key: ["projects", "list", params], queryFn: () => getProjectList(params) };
}

export function taskTemplateOptionsQuery(): ApiQueryOptions<TaskTemplateOptionVO[]> {
  return {
    key: ["templateOptions"],
    queryFn: getTaskTemplateOptions,
    staleTime: 300_000,
  };
}

export function projectDetailQuery(
  projectId: string | undefined,
): ApiQueryOptions<ProjectDetailInfoVO> {
  return {
    key: ["projects", "detail", projectId],
    queryFn: () => getProjectDetail(projectId!),
    enabled: Boolean(projectId),
  };
}

export function projectItemsQuery(
  projectId: string,
  pageNum = 1,
  status: ProjectItemListFilter | "" = "IN_PROGRESS",
): ApiQueryOptions<PageResult<ProjectItemListVO>> {
  const params = {
    pageNum,
    pageSize: PROJECT_ITEMS_PAGE_SIZE,
    status,
    sortBy: "MANUAL" as const,
  };
  return {
    key: ["items", "list", projectId, params],
    queryFn: () => getProjectItemList(projectId, params),
    enabled: Boolean(projectId),
  };
}

export function plazaStageScope(searchParams: URLSearchParams): "CURRENT" | "ALL" {
  return searchParams.get("stageScope") === "CURRENT" ? "CURRENT" : "ALL";
}

export function plazaListQuery(
  stageScope: "CURRENT" | "ALL",
  pageNum = 1,
  keyword = "",
  selectedType = "all",
  sortBy = DEFAULT_PLAZA_SORT,
  selectedTaskType = "all",
): ApiQueryOptions<PageResult<PlazaProjectGroup>> {
  const params = {
    pageNum,
    pageSize: PLAZA_PAGE_SIZE,
    keyword: keyword || undefined,
    projectType: selectedType === "all" ? undefined : selectedType,
    baseTaskId: selectedTaskType === "all" ? undefined : selectedTaskType,
    sortBy,
    stageScope,
  };
  return { key: ["plaza", "list", params], queryFn: () => getTaskPlaza(params) };
}

export function plazaTaskTypesQuery(): ApiQueryOptions<PlazaTaskTypeOption[]> {
  return { key: ["plaza", "taskTypes"], queryFn: getPlazaTaskTypes };
}

export function itemFlowQuery(itemId: string): ApiQueryOptions<ItemTaskFlowVO> {
  return {
    key: ["flow", itemId],
    queryFn: () => getItemTaskFlow(itemId),
    enabled: Boolean(itemId),
    staleTime: 0,
    // loader 每次进入都获取最新数据，挂载时直接复用，避免再发一次请求。
    refetchOnMount: false,
  };
}

export function itemInstancesQuery(itemId: string): ApiQueryOptions<ItemTaskInstanceVO[]> {
  return {
    key: ["instances", itemId],
    queryFn: () => getItemTaskInstances(itemId),
    enabled: Boolean(itemId),
    staleTime: 0,
    refetchOnMount: false,
  };
}
