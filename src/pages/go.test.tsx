// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ApiError } from "@/api/apiError";
import { AuthExpiredError } from "@/lib/authError";
import { queryClient } from "@/lib/queryClient";
import { scopedKey } from "@/lib/queryKeys";
import { clearSession, getCurrentOrgId, saveCurrentOrganization, saveSession } from "@/lib/session";
import { notificationService } from "@/services/notification";

import ExternalEntryPage from "./go";

const { switchOrganization, markNotificationRead, getNotificationStatus } = vi.hoisted(() => ({
  switchOrganization: vi.fn(),
  markNotificationRead: vi.fn(),
  getNotificationStatus: vi.fn(),
}));

vi.mock("@/api/user", () => ({ switchOrganization }));
vi.mock("@/api/notifications", () => ({
  markNotificationRead,
  getNotificationStatus,
}));

const task =
  "/go?type=TASK_READY&orgId=8&projectId=11&itemId=22&taskInstanceId=202&notificationId=9";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function installStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() {
      return store.size;
    },
    clear: (): void => {
      store.clear();
    },
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => [...store.keys()][index] ?? null,
    removeItem: (key: string): void => {
      store.delete(key);
    },
    setItem: (key: string, value: string): void => {
      store.set(key, String(value));
    },
  });
}

function LocationProbe(): ReactElement {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  installStorage();
  switchOrganization.mockReset();
  markNotificationRead.mockReset();
  getNotificationStatus.mockReset();
  markNotificationRead.mockResolvedValue({ id: "9", readAt: "2026-11-03 02:00:00" });
  getNotificationStatus.mockResolvedValue({ hasUnread: false });
  switchOrganization.mockResolvedValue({ id: "8", name: "组", role: "ORG_USER" });
  queryClient.clear();
  saveSession({ userId: "7", token: "token", refreshToken: "refresh", defaultOrgId: "8" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach((): void => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  clearSession();
  queryClient.clear();
});

async function open(path: string): Promise<void> {
  const router = createMemoryRouter(
    [
      { path: "/go", element: <ExternalEntryPage /> },
      { path: "/login", element: <LocationProbe /> },
      { path: "/dashboard/planning/:projectId/items/:itemId", element: <LocationProbe /> },
      { path: "/dashboard/org-admin/applications", element: <LocationProbe /> },
    ],
    { initialEntries: [path] },
  );
  await act(async () => {
    root?.render(<RouterProvider router={router} />);
  });
}

test("email entry marks the inbox message read before opening the target", async (): Promise<void> => {
  saveCurrentOrganization("1", "ORG_USER");
  const order: string[] = [];
  switchOrganization.mockImplementation(async () => {
    order.push("switch");
    expect(markNotificationRead).not.toHaveBeenCalled();
    return { id: "8", name: "组", role: "ORG_USER" };
  });
  markNotificationRead.mockImplementation(async (id: string) => {
    order.push("read");
    expect(id).toBe("9");
    expect(getCurrentOrgId()).toBe("8");
    queryClient.setQueryData(scopedKey(["notifications"], "org"), {
      pages: [{ list: [], unreadCount: 2, hasNext: false }],
      pageParams: [null],
    });
    return { id: "9", readAt: "2026-11-03 02:00:00" };
  });
  getNotificationStatus.mockImplementation(async () => {
    order.push("status");
    return { hasUnread: true };
  });

  await open(task);

  await vi.waitFor(() =>
    expect(container?.textContent).toBe("/dashboard/planning/11/items/22?taskInstanceId=202"),
  );
  expect(order).toEqual(["switch", "read", "status"]);
  expect(queryClient.getQueryData(scopedKey(["notificationStatus"], "org"))).toEqual({
    hasUnread: true,
  });
  expect(queryClient.getQueryData(scopedKey(["notifications"], "org"))).toBeUndefined();
});

test("same organization still marks the linked inbox message", async (): Promise<void> => {
  await open("/go?type=JOIN_APPLICATION&orgId=8&applicationId=77&notificationId=15");
  await vi.waitFor(() => expect(container?.textContent).toBe("/dashboard/org-admin/applications"));
  expect(switchOrganization).not.toHaveBeenCalled();
  expect(markNotificationRead).toHaveBeenCalledWith("15");
});

test("links without an inbox id open without marking read", async (): Promise<void> => {
  await open("/go?type=TASK_READY&orgId=8&projectId=11&itemId=22&taskInstanceId=202");
  await vi.waitFor(() =>
    expect(container?.textContent).toBe("/dashboard/planning/11/items/22?taskInstanceId=202"),
  );
  expect(markNotificationRead).not.toHaveBeenCalled();
  expect(getNotificationStatus).not.toHaveBeenCalled();
});

test("an unreadable inbox message does not block the email link", async (): Promise<void> => {
  const messages: string[] = [];
  const unsubscribe = notificationService.subscribe((notification) => {
    messages.push(notification.message);
  });
  markNotificationRead.mockRejectedValue(new ApiError("通知不存在"));

  await open(task);
  await vi.waitFor(() =>
    expect(container?.textContent).toBe("/dashboard/planning/11/items/22?taskInstanceId=202"),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(messages).toEqual([]);
  expect(getNotificationStatus).not.toHaveBeenCalled();
  unsubscribe();
});

test("an expired session does not continue into the target", async (): Promise<void> => {
  markNotificationRead.mockRejectedValue(new AuthExpiredError());
  await open(task);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(container?.textContent).toBe("正在打开…");
  expect(getNotificationStatus).not.toHaveBeenCalled();
});

test("task rejection email opens the rejected task", async (): Promise<void> => {
  await open("/go?type=TASK_REJECTED&orgId=8&projectId=11&itemId=22&taskInstanceId=202");
  await vi.waitFor(() =>
    expect(container?.textContent).toBe("/dashboard/planning/11/items/22?taskInstanceId=202"),
  );
  expect(markNotificationRead).not.toHaveBeenCalled();
});

test("logged-out email links resume at login", async (): Promise<void> => {
  clearSession();
  await open(task);
  await vi.waitFor(() => expect(container?.textContent).toContain("/login?next="));
  expect(markNotificationRead).not.toHaveBeenCalled();
});
