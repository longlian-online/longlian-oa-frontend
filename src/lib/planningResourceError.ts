import { ApiError } from "@/api/apiError";

export class PlanningResourceNotFoundError extends Error {
  readonly resource: "project" | "item";

  constructor(resource: "project" | "item") {
    super(resource === "project" ? "企划已删除或不可访问" : "项目已删除或不可访问");
    this.name = "PlanningResourceNotFoundError";
    this.resource = resource;
  }
}

export function isPlanningResourceNotFound(error: unknown): error is PlanningResourceNotFoundError {
  return error instanceof PlanningResourceNotFoundError;
}

export async function readPlanningResource<T>(
  resource: "project" | "item",
  load: () => Promise<T>,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    // 只识别服务端的数据不存在业务码；权限、网络及网关错误仍走原有错误入口。
    if (error instanceof ApiError && error.code === 6) {
      error.silence();
      throw new PlanningResourceNotFoundError(resource);
    }
    throw error;
  }
}
