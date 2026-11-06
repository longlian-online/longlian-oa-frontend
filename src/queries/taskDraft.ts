import { getTaskDraft } from "@/api/taskDraft";
import type { ApiQueryOptions } from "@/lib/apiQuery";
import type { TaskDraftDetailVO } from "@/types/taskDraft";

export function taskDraftQuery(instanceId: string): ApiQueryOptions<TaskDraftDetailVO> {
  return {
    key: ["taskDraft", instanceId],
    queryFn: () => getTaskDraft(instanceId),
    enabled: Boolean(instanceId),
    staleTime: 0,
  };
}
