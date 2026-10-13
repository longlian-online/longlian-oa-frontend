import { beforeEach, expect, test, vi } from "vite-plus/test";

import {
  clearSession,
  getCurrentOrgId,
  getSessionRole,
  saveCurrentOrganization,
  saveSession,
} from "@/lib/session";

const storage = new Map<string, string>();

beforeEach((): void => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      storage.set(key, value);
    },
    removeItem: (key: string): boolean => storage.delete(key),
  });
});

test("login stores the default org as the org later requests declare", (): void => {
  saveSession({
    userId: "1",
    token: "token",
    defaultOrgId: "99",
    role: "ORG_ADMIN",
  });

  expect(getCurrentOrgId()).toBe("99");
  expect(getSessionRole()).toBe("ORG_ADMIN");
});

test("missing default org clears any previously declared org", (): void => {
  storage.set("currentOrgId", "99");
  saveSession({ userId: "1", token: "token", defaultOrgId: null, role: null });

  expect(getCurrentOrgId()).toBeNull();
  expect(storage.has("currentOrgId")).toBe(false);
  expect(getSessionRole()).toBeNull();
});

test("disabled-looking or non-numeric org ids are not declared", (): void => {
  for (const defaultOrgId of ["", "0", "-1", "undefined", "12a"]) {
    saveSession({ userId: "1", token: "token", defaultOrgId, role: "ORG_USER" });
    expect(getCurrentOrgId()).toBeNull();
  }

  storage.set("currentOrgId", "org");
  expect(getCurrentOrgId()).toBeNull();
});

test("clearing the session removes the declared org", (): void => {
  saveSession({ userId: "1", token: "token", defaultOrgId: "9", role: "ORG_USER" });
  clearSession();

  expect(storage.get("token")).toBeUndefined();
  expect(getCurrentOrgId()).toBeNull();
  expect(getSessionRole()).toBeNull();
});

test("switching organization preserves user and admin sessions", (): void => {
  saveSession({ token: "user-token", userId: "1", defaultOrgId: "11", role: "ORG_ADMIN" });
  storage.set("adminToken", "admin-token");
  storage.set("adminRole", "SUPER_ADMIN");
  saveCurrentOrganization("22", " ORG_USER ");

  expect(getCurrentOrgId()).toBe("22");
  expect(getSessionRole()).toBe("ORG_USER");
  expect(storage.get("token")).toBe("user-token");
  expect(storage.get("userId")).toBe("1");
  expect(storage.get("adminToken")).toBe("admin-token");
  expect(storage.get("adminRole")).toBe("SUPER_ADMIN");
});

test("switching without a role removes previous administrator privileges", (): void => {
  for (const role of [undefined, null, "", "  "]) {
    saveSession({ token: "user-token", userId: "1", defaultOrgId: "11", role: "ORG_ADMIN" });
    saveCurrentOrganization("22", role);
    expect(getSessionRole()).toBeNull();
    expect(storage.has("role")).toBe(false);
  }
});
