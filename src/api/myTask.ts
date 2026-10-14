import { request } from "@/api/request";
import type { MyTaskListDTO, MyTaskPage } from "@/types/myTask";

/** 查询我接取的任务（依赖 BE #224） */
export async function getMyTasks(dto: MyTaskListDTO): Promise<MyTaskPage> {
  const searchParams = new URLSearchParams({ bucket: dto.bucket });
  if (dto.pageNum !== undefined) searchParams.set("pageNum", String(dto.pageNum));
  if (dto.pageSize !== undefined) searchParams.set("pageSize", String(dto.pageSize));
  if (dto.sortDirection) searchParams.set("sortDirection", dto.sortDirection);
  return request<MyTaskPage>(`/task/instance/mine?${searchParams.toString()}`);
}
