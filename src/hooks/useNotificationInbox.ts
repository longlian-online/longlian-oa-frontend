import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getNotifications, getNotificationStatus } from "@/api/notifications";
import { useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { executeScopedApi } from "@/lib/apiQuery";
import { isScopeCurrent, scopedKey } from "@/lib/queryKeys";
import type {
  NotificationCursor,
  NotificationPageVO,
  NotificationStatusVO,
} from "@/types/notifications";

const manualRefresh = {
  staleTime: Infinity,
  retry: false,
  retryOnMount: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export function useNotificationStatus(): UseQueryResult<NotificationStatusVO, Error> {
  const session = useSessionSnapshot();
  const client = useQueryClient();
  const key = scopedKey(["notificationStatus"], "org", session);
  return useQuery({
    ...manualRefresh,
    gcTime: Infinity,
    queryKey: key,
    enabled: Boolean(session.token && session.orgId),
    queryFn: async ({ signal }): Promise<NotificationStatusVO> => {
      const status = await executeScopedApi("org", session, getNotificationStatus, signal);
      // 进站检查不能覆盖之后已成功完成的列表或已读操作。
      return client.getQueryData<NotificationStatusVO>(key) ?? status;
    },
  });
}

export function useNotificationInbox(): UseInfiniteQueryResult<
  InfiniteData<NotificationPageVO, NotificationCursor | null>,
  Error
> {
  const session = useSessionSnapshot();
  const client = useQueryClient();
  return useInfiniteQuery({
    ...manualRefresh,
    gcTime: 0,
    queryKey: scopedKey(["notifications"], "org", session),
    enabled: Boolean(session.token && session.orgId),
    initialPageParam: null as NotificationCursor | null,
    queryFn: async ({ pageParam, signal }): Promise<NotificationPageVO> => {
      const page = await executeScopedApi(
        "org",
        session,
        () => getNotifications(pageParam),
        signal,
      );
      if (pageParam === null && !signal.aborted && isScopeCurrent("org", session)) {
        client.setQueryData<NotificationStatusVO>(
          scopedKey(["notificationStatus"], "org", session),
          {
            hasUnread: page.unreadCount > 0,
          },
        );
      }
      return page;
    },
    getNextPageParam: (lastPage): NotificationCursor | undefined => {
      const last = lastPage.list.at(-1);
      return lastPage.hasNext && last ? { createdAt: last.createdAt, id: last.id } : undefined;
    },
  });
}
