import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router";

import { markAllNotificationsRead, markNotificationRead } from "@/api/notifications";
import RemoteImage from "@/components/RemoteImage";
import { Button } from "@/components/ui/button";
import { useApiMutation, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { useNotificationInbox, useNotificationStatus } from "@/hooks/useNotificationInbox";
import {
  compareNotifications,
  formatNotificationTime,
  notificationPresentation,
  notificationTarget,
} from "@/lib/notification";
import { isScopeCurrent, scopedKey } from "@/lib/queryKeys";
import type { SessionSnapshot } from "@/lib/session";
import { cn } from "@/lib/utils";
import type {
  NotificationCursor,
  NotificationPageVO,
  NotificationStatusVO,
  NotificationVO,
} from "@/types/notifications";

type InboxData = InfiniteData<NotificationPageVO, NotificationCursor | null>;
interface NotificationPanelProps {
  panelId: string;
  onClose: () => void;
}

function NotificationPanel({ panelId, onClose }: NotificationPanelProps): ReactElement {
  const session = useSessionSnapshot();
  const inbox = useNotificationInbox();
  const client = useQueryClient();
  const navigate = useNavigate();
  const pending = useRef(false);
  const [reading, setReading] = useState(false);
  const [now] = useState(() => Date.now());
  const key = scopedKey(["notifications"], "org", session);
  const unreadCount = inbox.data?.pages[0]?.unreadCount ?? 0;
  const rows = [...(inbox.data?.pages.flatMap((page) => page.list) ?? [])].sort(
    compareNotifications,
  );
  const busy = reading || inbox.isFetchingNextPage;

  function patchRead(id: string | null, readAt: string, captured: InboxData | undefined): void {
    if (!isScopeCurrent("org", session)) return;
    const current = client.getQueryData<InboxData>(key) ?? captured;
    if (!current) return;
    const wasUnread =
      id !== null &&
      current.pages.some((page) => page.list.some((row) => row.id === id && row.readAt === null));
    const count = id === null ? 0 : Math.max(0, current.pages[0].unreadCount - (wasUnread ? 1 : 0));
    client.setQueryData<InboxData>(
      key,
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page, index) => ({
            ...page,
            ...(index === 0 ? { unreadCount: count } : {}),
            list: page.list.map((row) =>
              (id === null || row.id === id) && row.readAt === null ? { ...row, readAt } : row,
            ),
          })),
        },
    );
    client.setQueryData<NotificationStatusVO>(scopedKey(["notificationStatus"], "org", session), {
      hasUnread: count > 0,
    });
  }

  const read = useApiMutation({
    scope: "org",
    invalidate: [],
    mutationFn: async (id: string) => {
      const captured = client.getQueryData<InboxData>(key);
      const result = await markNotificationRead(id);
      // 缓存在 mutationFn 成功时更新；面板关闭不能丢掉服务器已完成的已读结果。
      patchRead(id, result.readAt, captured);
      return result;
    },
  });
  const readAll = useApiMutation({
    scope: "org",
    invalidate: [],
    mutationFn: async () => {
      const captured = client.getQueryData<InboxData>(key);
      const result = await markAllNotificationsRead();
      patchRead(null, result.readAt, captured);
      return result;
    },
  });

  async function openNotification(row: NotificationVO): Promise<void> {
    if (pending.current || !isScopeCurrent("org", session)) return;
    pending.current = true;
    setReading(true);
    try {
      if (row.readAt === null) await read.mutateAsync(row.id);
      if (!isScopeCurrent("org", session)) return;
      const target = notificationTarget(notificationPresentation(row).targetPath);
      if (target) {
        onClose();
        void navigate(target);
      }
    } catch {
      // 共享 Mutation 提示失败；保留当前面板和未读标记。
    } finally {
      pending.current = false;
      setReading(false);
    }
  }

  async function markAllRead(): Promise<void> {
    if (pending.current || unreadCount === 0) return;
    pending.current = true;
    setReading(true);
    try {
      await readAll.mutateAsync();
    } catch {
      // 共享 Mutation 负责错误提示。
    } finally {
      pending.current = false;
      setReading(false);
    }
  }

  async function loadMore(): Promise<void> {
    if (pending.current) return;
    pending.current = true;
    setReading(true);
    try {
      await inbox.fetchNextPage();
    } finally {
      pending.current = false;
      setReading(false);
    }
  }

  return (
    <div
      id={panelId}
      role="dialog"
      aria-labelledby={`${panelId}-title`}
      className="fixed right-4 top-14 z-50 w-[min(22.5rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg sm:absolute sm:right-0 sm:top-full sm:mt-2"
    >
      <div className="flex items-center justify-between gap-3 px-2 py-1.5">
        <h2 id={`${panelId}-title`} className="text-sm font-medium text-foreground">
          通知
        </h2>
        <Button
          variant="ghost"
          size="xs"
          disabled={busy || unreadCount === 0}
          onClick={() => void markAllRead()}
        >
          全部已读
        </Button>
      </div>
      <div className="max-h-[min(20rem,calc(100dvh-9rem))] overflow-y-auto overscroll-contain">
        {!session.orgId ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            请选择组织后查看通知
          </p>
        ) : !inbox.data ? (
          inbox.isError ? (
            <div className="px-2 py-8 text-center text-sm">
              <p>通知加载失败</p>
              <Button variant="ghost" size="sm" onClick={() => void inbox.refetch()}>
                重试
              </Button>
            </div>
          ) : (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">正在加载通知…</p>
          )
        ) : rows.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">暂无通知</p>
        ) : (
          <>
            <ul>
              {rows.map((row) => {
                const presentation = notificationPresentation(row);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={busy}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:cursor-wait"
                      onClick={() => void openNotification(row)}
                    >
                      <span
                        aria-hidden
                        className="size-12 shrink-0 overflow-hidden rounded-md bg-muted"
                      >
                        {row.thumbnailUrl && (
                          <RemoteImage
                            src={row.thumbnailUrl}
                            alt=""
                            className="size-full bg-muted"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {presentation.label}
                          </span>
                          <time
                            dateTime={row.createdAt.replace(" ", "T")}
                            className="ml-auto shrink-0 text-xs text-muted-foreground"
                          >
                            {formatNotificationTime(row.createdAt, now)}
                          </time>
                          {row.readAt === null && (
                            <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
                          )}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block break-words text-sm leading-5",
                            row.readAt === null ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {row.readAt === null && <span className="sr-only">未读，</span>}
                          {presentation.message}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="px-2 py-2 text-center text-xs text-muted-foreground">
              {inbox.hasNextPage ? (
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void loadMore()}>
                  {inbox.isFetchingNextPage
                    ? "加载中…"
                    : inbox.isFetchNextPageError
                      ? "加载失败，重试"
                      : "加载更多"}
                </Button>
              ) : (
                "没有更多通知了"
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function NotificationCenter(): ReactElement {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const opening = useRef(false);
  const session = useSessionSnapshot();
  const status = useNotificationStatus();
  const client = useQueryClient();
  const [openedSession, setOpenedSession] = useState<SessionSnapshot | null>(null);
  const open =
    openedSession !== null &&
    openedSession.appScope === session.appScope &&
    openedSession.orgId === session.orgId;

  useEffect(() => {
    if (openedSession && !open) setOpenedSession(null);
  }, [openedSession, open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpenedSession(null);
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setOpenedSession(null);
      rootRef.current?.querySelector("button")?.focus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function toggle(): Promise<void> {
    if (open) {
      setOpenedSession(null);
      return;
    }
    if (opening.current) return;
    opening.current = true;
    const captured = session;
    try {
      const key = scopedKey(["notifications"], "org", captured);
      await client.cancelQueries({ queryKey: key, exact: true });
      client.removeQueries({ queryKey: key, exact: true });
      if (isScopeCurrent("org", captured)) setOpenedSession(captured);
    } finally {
      opening.current = false;
    }
  }

  const label = status.data
    ? status.data.hasUnread
      ? "通知，有未读通知"
      : "通知"
    : status.isError
      ? "通知，未读状态暂不可用"
      : session.token && session.orgId
        ? "通知，正在检查未读状态"
        : "通知";
  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative"
        onClick={() => void toggle()}
      >
        <Bell className="h-4 w-4" />
        {status.data?.hasUnread && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        )}
      </Button>
      {open && <NotificationPanel panelId={panelId} onClose={() => setOpenedSession(null)} />}
    </div>
  );
}
