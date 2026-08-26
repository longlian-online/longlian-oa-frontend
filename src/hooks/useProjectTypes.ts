import { useEffect, useState } from "react";

import { getProjectTypes } from "@/api/planning";
import { $tip } from "@/components/tip";
import type { ProjectTypeInfoVO } from "@/types/planning";

interface UseProjectTypesResult {
  projectTypes: ProjectTypeInfoVO[];
  loading: boolean;
  reload: () => Promise<void>;
}

const FALLBACK_PROJECT_TYPES: ProjectTypeInfoVO[] = [{ id: 1, name: "漫画" }];

export function useProjectTypes(): UseProjectTypesResult {
  const [projectTypes, setProjectTypes] = useState<ProjectTypeInfoVO[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProjectTypes(): Promise<void> {
    try {
      setLoading(true);
      const data = await getProjectTypes();
      setProjectTypes(data.length > 0 ? data : FALLBACK_PROJECT_TYPES);
    } catch {
      setProjectTypes(FALLBACK_PROJECT_TYPES);
      $tip("企划类型接口暂无数据，已使用默认类型：漫画", "warning");
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
