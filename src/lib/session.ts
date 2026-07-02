import type { LoginVO } from "@/types/auth";

const TOKEN_KEY = "token";
const USER_ID_KEY = "userId";
const CURRENT_ORG_ID_KEY = "currentOrgId";
const ROLES_KEY = "roles";

export function saveSession(session: LoginVO): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_ID_KEY, session.userId);
  localStorage.setItem(CURRENT_ORG_ID_KEY, session.currentOrgId);
  localStorage.setItem(ROLES_KEY, JSON.stringify(session.roles));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(CURRENT_ORG_ID_KEY);
  localStorage.removeItem(ROLES_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentOrgId(): string | null {
  return localStorage.getItem(CURRENT_ORG_ID_KEY);
}

export function getSessionRoles(): string[] {
  const rawRoles = localStorage.getItem(ROLES_KEY);
  if (!rawRoles) return [];

  try {
    const roles = JSON.parse(rawRoles);
    return Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === "string")
      : [];
  } catch {
    return [];
  }
}
