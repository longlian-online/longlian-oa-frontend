import { getBaseTaskOptions } from "@/api/baseTask";
import { getMyTasks } from "@/api/myTask";
import { getOrganizationBaseTaskList, getTaskWebhookFailures } from "@/api/organizationAdmin";
import { getWorkshopList } from "@/api/workshop";
import { getWorkshopTaskTemplateList } from "@/api/workflowTemplate";

import type { ApiQueryOptions } from "@/lib/apiQuery";
import type { MyTaskBucket, MyTaskPage, MyTaskSortDirection } from "@/types/myTask";
import type {
  OrganizationBaseTaskVO,
  OrganizationPageResult,
  TaskWebhookFailureVO,
} from "@/types/organizationAdmin";
import type { PageResult } from "@/types/planning";
import type { BaseTaskOption, BaseTaskVO, WorkshopTaskTemplateVO } from "@/types/workflowTemplate";
import type { WorkshopProjectInfoVO, WorkshopSortBy } from "@/types/workshop";

export const WORKSHOP_PAGE_SIZE = 6;
export const MY_TASK_PAGE_SIZE = 5;
export const BASE_TASK_PAGE_SIZE = 12;
export const WORKFLOW_PAGE_SIZE = 8;
export const DEFAULT_TASK_SORT: MyTaskSortDirection = "ASC";
export const DEFAULT_WORKSHOP_SORT: WorkshopSortBy = "RECENT_SUBMISSION";

export function workshopListQuery(
  pageNum = 1,
  keyword = "",
  selectedType = "all",
  isMyCreated = false,
  sortBy = DEFAULT_WORKSHOP_SORT,
): ApiQueryOptions<PageResult<WorkshopProjectInfoVO>> {
  const params = {
    pageNum,
    pageSize: WORKSHOP_PAGE_SIZE,
    keyword: keyword || undefined,
    projectType: selectedType === "all" ? undefined : selectedType,
    isMyCreated,
    sortBy,
  };
  return { key: ["workshop", "list", params], queryFn: () => getWorkshopList(params) };
}

export function myTasksQuery(
  bucket: MyTaskBucket,
  pageNum = 1,
  sortDirection = DEFAULT_TASK_SORT,
): ApiQueryOptions<MyTaskPage> {
  const params = { bucket, pageNum, pageSize: MY_TASK_PAGE_SIZE, sortDirection };
  return { key: ["myTasks", params], queryFn: () => getMyTasks(params) };
}

export function workflowListQuery(
  pageNum = 1,
  keyword = "",
): ApiQueryOptions<PageResult<WorkshopTaskTemplateVO>> {
  const params = { pageNum, pageSize: WORKFLOW_PAGE_SIZE, keyword: keyword || undefined };
  return { key: ["templates", "list", params], queryFn: () => getWorkshopTaskTemplateList(params) };
}

function toEditorBaseTask(task: BaseTaskOption): BaseTaskVO {
  return {
    id: task.id,
    name: task.name,
    description: task.description,
    icon: task.icon,
    submitFields: [],
    refCount: 0,
    status: task.status,
    createdAt: "",
  };
}

export function baseTaskOptionsQuery(): ApiQueryOptions<BaseTaskVO[]> {
  return {
    key: ["baseTasks", "options"],
    queryFn: async () => (await getBaseTaskOptions()).map(toEditorBaseTask),
    staleTime: 300_000,
  };
}

export function organizationBaseTasksQuery(
  pageNum = 1,
  keyword = "",
): ApiQueryOptions<OrganizationPageResult<OrganizationBaseTaskVO>> {
  const params = {
    pageNum,
    pageSize: BASE_TASK_PAGE_SIZE,
    keyword: keyword || undefined,
    sortBy: "REF_COUNT" as const,
    orderDir: "DESC" as const,
  };
  return { key: ["baseTasks", "list", params], queryFn: () => getOrganizationBaseTaskList(params) };
}

export function taskWebhookFailuresQuery(
  pageNum: number,
): ApiQueryOptions<OrganizationPageResult<TaskWebhookFailureVO>> {
  return {
    key: ["taskWebhooks", "failures", pageNum],
    queryFn: () => getTaskWebhookFailures(pageNum, 20),
  };
}
