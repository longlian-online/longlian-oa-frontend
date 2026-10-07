export const AUTH_EXPIRED_MESSAGE = "登录已过期，请重新登录";
export const AUTH_EXPIRED_EVENT = "auth-expired";

export class AuthExpiredError extends Error {
  constructor() {
    super(AUTH_EXPIRED_MESSAGE);
    this.name = "AuthExpiredError";
  }
}

export function redirectExpiredSession(loginPath: string): void {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  if (window.location.pathname !== loginPath) {
    window.history.replaceState(null, "", loginPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
