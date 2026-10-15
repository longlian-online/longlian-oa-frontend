import type { AdminLoginVO, LoginVO } from "@/types/auth";

const TOKEN_KEY = "token";
const USER_ID_KEY = "userId";
const CURRENT_ORG_ID_KEY = "currentOrgId";
const ROLE_KEY = "role";
const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_ID_KEY = "adminId";
const ADMIN_USERNAME_KEY = "adminUsername";
const ADMIN_ROLE_KEY = "adminRole";

export function saveSession(session: LoginVO): void {
  forceAppScope = true;
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_ID_KEY, session.userId);
  writeCurrentOrganization(session.defaultOrgId ?? "", session.role);
  localStorage.removeItem("roles");
  notifySessionChange();
}

export function saveCurrentOrganization(orgId: string, role?: string | null): void {
  writeCurrentOrganization(orgId, role);
  notifySessionChange();
}

function writeCurrentOrganization(orgId: string, role?: string | null): void {
  const currentOrgId = usableOrgId(orgId);
  if (currentOrgId) {
    localStorage.setItem(CURRENT_ORG_ID_KEY, currentOrgId);
  } else {
    localStorage.removeItem(CURRENT_ORG_ID_KEY);
  }
  const normalizedRole = role?.trim();
  if (normalizedRole) {
    localStorage.setItem(ROLE_KEY, normalizedRole);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(CURRENT_ORG_ID_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem("roles");
  notifySessionChange();
}

export function saveAdminSession(session: AdminLoginVO): void {
  forceAdminScope = true;
  localStorage.setItem(ADMIN_TOKEN_KEY, session.token);
  localStorage.setItem(ADMIN_ID_KEY, session.adminId);
  localStorage.setItem(ADMIN_USERNAME_KEY, session.username);
  localStorage.setItem(ADMIN_ROLE_KEY, session.role);
  notifySessionChange();
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_ID_KEY);
  localStorage.removeItem(ADMIN_USERNAME_KEY);
  localStorage.removeItem(ADMIN_ROLE_KEY);
  notifySessionChange();
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminUsername(): string | null {
  return localStorage.getItem(ADMIN_USERNAME_KEY);
}

export function getAdminRole(): string | null {
  return localStorage.getItem(ADMIN_ROLE_KEY);
}

export function getCurrentOrgId(): string | null {
  return usableOrgId(localStorage.getItem(CURRENT_ORG_ID_KEY));
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function getSessionRole(): string | null {
  const role = localStorage.getItem(ROLE_KEY)?.trim();
  return role ? role : null;
}

function usableOrgId(orgId: string | null | undefined): string | null {
  return typeof orgId === "string" && /^[1-9]\d*$/.test(orgId) ? orgId : null;
}

export function isOrganizationAdmin(): boolean {
  return getSessionRole() === "ORG_ADMIN";
}

export interface SessionSnapshot {
  token: string | null;
  adminToken: string | null;
  userId: string | null;
  orgId: string | null;
  role: string | null;
  appScope: string;
  adminScope: string;
}

const sessionListeners = new Set<() => void>();
let cachedSnapshot: SessionSnapshot | undefined;
let scopeSequence = 0;
let forceAppScope = false;
let forceAdminScope = false;

export function getSessionSnapshot(): SessionSnapshot {
  const token = getToken();
  const adminToken = getAdminToken();
  const userId = getUserId();
  const orgId = getCurrentOrgId();
  const role = getSessionRole();
  if (
    !forceAppScope &&
    !forceAdminScope &&
    cachedSnapshot &&
    cachedSnapshot.token === token &&
    cachedSnapshot.adminToken === adminToken &&
    cachedSnapshot.userId === userId &&
    cachedSnapshot.orgId === orgId &&
    cachedSnapshot.role === role
  )
    return cachedSnapshot;
  cachedSnapshot = {
    token,
    adminToken,
    userId,
    orgId,
    role,
    appScope:
      !forceAppScope && cachedSnapshot?.token === token && cachedSnapshot.userId === userId
        ? cachedSnapshot.appScope
        : `session-${++scopeSequence}`,
    adminScope:
      !forceAdminScope && cachedSnapshot?.adminToken === adminToken
        ? cachedSnapshot.adminScope
        : `admin-session-${++scopeSequence}`,
  };
  forceAppScope = false;
  forceAdminScope = false;
  return cachedSnapshot;
}

export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return (): void => {
    sessionListeners.delete(listener);
  };
}

function notifySessionChange(): void {
  getSessionSnapshot();
  for (const listener of sessionListeners) listener();
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (): void => {
    notifySessionChange();
  });
}
