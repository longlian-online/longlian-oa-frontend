import { getProjectTypes } from "@/api/planning";
import { useApiQuery } from "@/hooks/queries/useApiQuery";

import type { ProjectTypeInfoVO } from "@/types/planning";

interface UseProjectTypesResult {
  projectTypes: ProjectTypeInfoVO[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}
export function useProjectTypes(): UseProjectTypesResult {
  const query = useApiQuery({
    key: ["projectTypes"],
    queryFn: getProjectTypes,
    staleTime: 300_000,
  });
  return {
    projectTypes: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    reload: async (): Promise<void> => {
      await query.refetch();
    },
  };
}
