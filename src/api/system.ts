import { commonRequest } from "@/api/request";

import type { SystemInfoVO } from "@/types/system";

export function getSystemInfo(): Promise<SystemInfoVO> {
  return commonRequest<SystemInfoVO>("/system/info");
}
