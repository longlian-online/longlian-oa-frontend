import { useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { deleteProject } from "@/api/planning";
import { deleteProjectItem } from "@/api/projectItem";
import { useApiMutation, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { retireDeletedItemQueries, retireDeletedProjectQueries } from "@/lib/planningDeletionCache";

export function useDeleteProjectItem(projectId: string): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  const session = useSessionSnapshot();
  return useApiMutation({
    mutationFn: async (itemId: string): Promise<void> => {
      await deleteProjectItem(projectId, itemId);
      await retireDeletedItemQueries(client, itemId, session);
    },
    invalidate: [["items"], ["projects"], ["myTasks"], ["workshop"], ["plaza"]],
  });
}

export function useDeleteProject(projectId: string): UseMutationResult<void, Error, void> {
  const client = useQueryClient();
  const session = useSessionSnapshot();
  return useApiMutation({
    mutationFn: async (): Promise<void> => {
      await deleteProject(projectId);
      await retireDeletedProjectQueries(client, projectId, session);
    },
    invalidate: [
      ["projects", "list"],
      ["projects", "management"],
      ["myTasks"],
      ["workshop"],
      ["plaza"],
    ],
  });
}
