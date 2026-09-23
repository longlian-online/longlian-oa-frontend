import { $tip } from "@/components/tip";
import {
  clearAdminSession,
  clearSession,
  getAdminToken,
  getToken,
  subscribeSession,
} from "@/lib/session";

export type AuthScope = "user" | "admin";

interface AuthNavigateOptions {
  replace?: boolean;
}

type AuthNavigate = (to: string, options?: AuthNavigateOptions) => void;

const LOGIN_PATH: Record<AuthScope, string> = {
  user: "/login",
  admin: "/admin/login",
};

const EXPIRED_MESSAGE: Record<AuthScope, string> = {
  user: "登录已过期，请重新登录",
  admin: "管理端登录已过期，请重新登录",
};

let authNavigate: AuthNavigate | null = null;
let pendingScope: AuthScope | null = null;

export class UnauthorizedError extends Error {
  readonly scope: AuthScope;

  constructor(scope: AuthScope) {
    super(EXPIRED_MESSAGE[scope]);
    this.name = "UnauthorizedError";
    this.scope = scope;
  }
}

export function registerAuthNavigate(navigate: AuthNavigate): () => void {
  authNavigate = navigate;

  return () => {
    if (authNavigate === navigate) {
      authNavigate = null;
    }
  };
}

export function handleUnauthorized(scope: AuthScope): UnauthorizedError {
  const error = new UnauthorizedError(scope);

  if (pendingScope === scope) {
    return error;
  }

  pendingScope = scope;

  if (scope === "admin") {
    clearAdminSession();
  } else {
    clearSession();
  }

  $tip(EXPIRED_MESSAGE[scope], "error");

  const loginPath = LOGIN_PATH[scope];
  if (authNavigate) {
    authNavigate(loginPath, { replace: true });
  } else if (typeof window !== "undefined") {
    window.location.replace(loginPath);
  }

  return error;
}

subscribeSession(() => {
  if (getToken() || getAdminToken()) {
    pendingScope = null;
  }
});
