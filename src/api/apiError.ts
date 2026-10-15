import { GATEWAY_ERROR_MESSAGE, notificationService } from "@/services/notification";

export class ApiError extends Error {
  silenced = false;

  constructor(message: string, notify = true) {
    super(message);
    this.name = "ApiError";
    // Catch blocks run before timers, so they can silence a stale response first.
    setTimeout(() => {
      if (this.silenced || !notify) return;
      notificationService.notify({ type: "error", message: this.message });
    }, 0);
  }

  silence(): void {
    this.silenced = true;
  }
}

export class GatewayError extends ApiError {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(status: number, notify = true, retryAfterMs?: number) {
    super(GATEWAY_ERROR_MESSAGE, notify);
    this.name = "GatewayError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, notify = true) {
    super(message, notify);
    this.name = "NetworkError";
  }
}
