import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { getProjectDetail } from "@/api/planning";
import CreateProject from "@/pages/dashboard/planning/create";
import { $tip } from "@/components/tip";
import type { ProjectDetailInfoVO } from "@/types/planning";

export default function EditProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetailInfoVO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    void getProjectDetail(projectId)
      .then((data) => {
        setProject(data);
      })
      .catch((error: unknown) => {
        $tip(error instanceof Error ? error.message : "企划加载失败", "error");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId || loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  if (!project) {
    return <div className="py-8 text-center text-sm text-muted-foreground">企划不存在</div>;
  }

  if (!project.isCreator) {
    return <div className="py-8 text-center text-sm text-muted-foreground">无权编辑该企划</div>;
  }

  return <CreateProject project={project} />;
}
