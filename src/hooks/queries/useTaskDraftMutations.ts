import { useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { saveTaskDraft, submitTaskDraft } from "@/api/taskDraft";
import { useApiMutation, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { isScopeCurrent, scopedKey } from "@/lib/queryKeys";
import { taskDraftQuery } from "@/queries/taskDraft";
import type {
  TaskDraftDetailVO,
  TaskDraftSaveDTO,
  TaskDraftSubmitDTO,
  TaskDraftSubmitResultVO,
} from "@/types/taskDraft";

export function useSaveTaskDraft(
  instanceId: string,
): UseMutationResult<TaskDraftDetailVO, Error, TaskDraftSaveDTO> {
  const client = useQueryClient();
  const session = useSessionSnapshot();
  return useApiMutation({
    key: ["taskDraft", instanceId, "save"],
    mutationFn: async (dto: TaskDraftSaveDTO): Promise<TaskDraftDetailVO> => {
      const result = await saveTaskDraft(instanceId, dto);
      if (!isScopeCurrent("org", session)) throw new DOMException("会话已切换", "AbortError");
      await client.cancelQueries({
        queryKey: scopedKey(taskDraftQuery(instanceId).key, "org", session),
      });
      client.setQueryData(scopedKey(taskDraftQuery(instanceId).key, "org", session), result);
      return result;
    },
    invalidate: [["myTasks"]],
  });
}

export function useSubmitTaskDraft(
  instanceId: string,
): UseMutationResult<TaskDraftSubmitResultVO, Error, TaskDraftSubmitDTO> {
  const client = useQueryClient();
  const session = useSessionSnapshot();
  return useApiMutation({
    key: ["taskDraft", instanceId, "submit"],
    mutationFn: async (dto: TaskDraftSubmitDTO): Promise<TaskDraftSubmitResultVO> => {
      const result = await submitTaskDraft(instanceId, dto);
      if (!isScopeCurrent("org", session)) throw new DOMException("会话已切换", "AbortError");
      // 提交后任务已完成，关闭编辑器前不再发起仅接取人可读的草稿查询。
      await client.cancelQueries({
        queryKey: scopedKey(taskDraftQuery(instanceId).key, "org", session),
      });
      await client.invalidateQueries({
        queryKey: scopedKey(taskDraftQuery(instanceId).key, "org", session),
        refetchType: "none",
      });
      return result;
    },
    invalidate: [
      ["flow"],
      ["instances"],
      ["taskDetail"],
      ["taskVersions"],
      ["myTasks"],
      ["items"],
      ["projects"],
      ["workshop"],
      ["plaza"],
    ],
  });
}
