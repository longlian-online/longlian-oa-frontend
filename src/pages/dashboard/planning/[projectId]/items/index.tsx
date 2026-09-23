import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { getProjectDetail } from "@/api/planning";
import ProjectItemSection from "@/components/ProjectItem";
import { showApiError } from "@/lib/apiError";
import type { ProjectDetailInfoVO } from "@/types/planning";

export default function ProjectItemListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetailInfoVO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    void getProjectDetail(projectId)
      .then(setProject)
      .catch((error: unknown) => {
        showApiError(error, "项目加载失败");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return <div className="py-8 text-center text-sm text-muted-foreground">项目不存在</div>;
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  if (!project) {
    return <div className="py-8 text-center text-sm text-muted-foreground">项目不存在</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <ProjectItemSection projectId={projectId} isCreator={project.isCreator} />
    </div>
  );
}
