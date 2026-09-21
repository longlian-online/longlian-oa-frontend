import { $tip } from "@/components/tip";
import { UnauthorizedError } from "@/lib/authRedirect";

export class ApiError extends Error {
  readonly code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export function showApiError(error: unknown, fallback: string): void {
  if (error instanceof UnauthorizedError) {
    //Request层把错误包装成UnauthorizedError时直接返回, 不重复Toast
    return;
  }

  $tip(error instanceof Error ? error.message : fallback, "error");
}
