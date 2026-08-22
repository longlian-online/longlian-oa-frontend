import { request } from "@/api/request";
import type { PageResult } from "@/types/planning";
import type { WorkshopListDTO, WorkshopProjectInfoVO } from "@/types/workshop";

export async function getWorkshopList(
  dto: WorkshopListDTO,
): Promise<PageResult<WorkshopProjectInfoVO>> {
  return request("/workshop/list", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
