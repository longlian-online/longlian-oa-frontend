import { beforeEach, expect, test, vi } from "vite-plus/test";

import { clearSession, getCurrentOrgId, getSessionRoles, saveSession } from "@/lib/session";

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
    roles: ["ORG_ADMIN"],
  });

  expect(getCurrentOrgId()).toBe("99");
  expect(getSessionRoles()).toEqual(["ORG_ADMIN"]);
});

test("missing default org clears any previously declared org", (): void => {
  storage.set("currentOrgId", "99");
  saveSession({ userId: "1", token: "token", defaultOrgId: null, roles: [] });

  expect(getCurrentOrgId()).toBeNull();
  expect(storage.has("currentOrgId")).toBe(false);
  expect(getSessionRoles()).toEqual([]);
});

test("disabled-looking or non-numeric org ids are not declared", (): void => {
  for (const defaultOrgId of ["", "0", "-1", "undefined", "12a"]) {
    saveSession({ userId: "1", token: "token", defaultOrgId, roles: ["ORG_USER"] });
    expect(getCurrentOrgId()).toBeNull();
  }

  storage.set("currentOrgId", "org");
  expect(getCurrentOrgId()).toBeNull();
});

test("clearing the session removes the declared org", (): void => {
  saveSession({ userId: "1", token: "token", defaultOrgId: "9", roles: ["ORG_USER"] });
  clearSession();

  expect(storage.get("token")).toBeUndefined();
  expect(getCurrentOrgId()).toBeNull();
  expect(getSessionRoles()).toEqual([]);
});
