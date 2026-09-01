import { useEffect, useState } from "react";

import { getProjectTypes } from "@/api/planning";
import { $tip } from "@/components/tip";
import type { ProjectTypeInfoVO } from "@/types/planning";

interface UseProjectTypesResult {
  projectTypes: ProjectTypeInfoVO[];
  loading: boolean;
  reload: () => Promise<void>;
}

export function useProjectTypes(): UseProjectTypesResult {
  const [projectTypes, setProjectTypes] = useState<ProjectTypeInfoVO[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProjectTypes(): Promise<void> {
    try {
      setLoading(true);
      const data = await getProjectTypes();
      setProjectTypes(data);
    } catch (error) {
      setProjectTypes([]);
      $tip(error instanceof Error ? error.message : "企划类型加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjectTypes();
  }, []);

  return {
    projectTypes,
    loading,
    reload: loadProjectTypes,
  };
}
