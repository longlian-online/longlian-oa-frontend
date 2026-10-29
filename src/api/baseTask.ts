import { request } from "@/api/request";
import type { BaseTaskOption } from "@/types/workflowTemplate";

export async function getBaseTaskOptions(): Promise<BaseTaskOption[]> {
  return request<BaseTaskOption[]>("/task/base/options");
}
