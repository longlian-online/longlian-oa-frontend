import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { scopedKey } from "@/lib/queryKeys";
import type { SessionSnapshot } from "@/lib/session";
import type { PageResult } from "@/types/planning";
import type { ProjectItemListVO, ProjectItemOrderEntryVO } from "@/types/projectItem";
import type { ItemTaskFlowVO, ItemTaskInstanceVO } from "@/types/workflowInstance";

function itemDetailKeys(client: QueryClient, itemId: string, session: SessionSnapshot): QueryKey[] {
  const instances = client.getQueryData<ItemTaskInstanceVO[]>(
    scopedKey(["instances", itemId], "org", session),
  );
  const flow = client.getQueryData<ItemTaskFlowVO>(scopedKey(["flow", itemId], "org", session));
  const instanceIds = new Set([
    ...(instances ?? []).map((instance) => instance.id),
    ...(flow?.nodes ?? []).flatMap((node) => (node.taskInstanceId ? [node.taskInstanceId] : [])),
  ]);
  return [
    ["flow", itemId],
    ["instances", itemId],
    ...[...instanceIds].flatMap((id): QueryKey[] => [
      ["taskDetail", id],
      ["taskVersions", id],
    ]),
  ];
}

async function retireQueries(
  client: QueryClient,
  keys: QueryKey[],
  session: SessionSnapshot,
): Promise<void> {
  const filters = keys.map((key) => ({ queryKey: scopedKey(key, "org", session) }));
  // 已删除对象不能再 refetch；取消迟到响应，活动查询只标记过期，避免卸载前被重新创建。
  await Promise.all(filters.map((filter) => client.cancelQueries(filter)));
  await Promise.all(
    filters.map((filter) => client.invalidateQueries({ ...filter, refetchType: "none" })),
  );
  for (const filter of filters) client.removeQueries({ ...filter, type: "inactive" });
}

export function retireDeletedItemQueries(
  client: QueryClient,
  itemId: string,
  session: SessionSnapshot,
): Promise<void> {
  return retireQueries(client, itemDetailKeys(client, itemId, session), session);
}

export function retireDeletedProjectQueries(
  client: QueryClient,
  projectId: string,
  session: SessionSnapshot,
): Promise<void> {
  const lists = client.getQueriesData<PageResult<ProjectItemListVO>>({
    queryKey: scopedKey(["items", "list", projectId], "org", session),
  });
  const order = client.getQueryData<ProjectItemOrderEntryVO[]>(
    scopedKey(["items", "order", projectId], "org", session),
  );
  const itemIds = new Set([
    ...lists.flatMap(([, page]) => (page?.list ?? []).map((item) => item.id)),
    ...(order ?? []).map((item) => item.id),
  ]);
  return retireQueries(
    client,
    [
      ["projects", "detail", projectId],
      ["items", "list", projectId],
      ["items", "order", projectId],
      ...[...itemIds].flatMap((itemId) => itemDetailKeys(client, itemId, session)),
    ],
    session,
  );
}
