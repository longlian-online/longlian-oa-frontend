import { request } from "@/api/request";
import type { PageResult } from "@/types/planning";
import type { PlazaListDTO, PlazaProjectGroup, PlazaTaskTypeOption } from "@/types/plaza";

function toQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/** 查询任务大厅，支持所有阶段或当前阶段的待接取任务 */
export async function getTaskPlaza(dto: PlazaListDTO): Promise<PageResult<PlazaProjectGroup>> {
  return request<PageResult<PlazaProjectGroup>>(
    `/task/instance/plaza${toQueryString({
      baseTaskId: dto.baseTaskId,
      keyword: dto.keyword,
      projectType: dto.projectType,
      sortBy: dto.sortBy,
      stageScope: dto.stageScope,
      pageNum: dto.pageNum,
      pageSize: dto.pageSize,
    })}`,
  );
}

export async function getPlazaTaskTypes(): Promise<PlazaTaskTypeOption[]> {
  return request<PlazaTaskTypeOption[]>("/task/instance/plaza/task-types");
}
