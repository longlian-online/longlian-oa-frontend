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
    return;
  }

  $tip(error instanceof Error ? error.message : fallback, "error");
}
