import { GATEWAY_ERROR_MESSAGE, notificationService } from "@/services/notification";

export class ApiError extends Error {
  silenced = false;

  constructor(message: string) {
    super(message);
    this.name = "ApiError";
    // Catch blocks run before timers, so they can silence a stale response first.
    setTimeout(() => {
      if (this.silenced) return;
      notificationService.notify({ type: "error", message: this.message });
    }, 0);
  }

  silence(): void {
    this.silenced = true;
  }
}

export class GatewayError extends ApiError {
  readonly status: number;

  constructor(status: number) {
    super(GATEWAY_ERROR_MESSAGE);
    this.name = "GatewayError";
    this.status = status;
  }
}
