import { useParams } from "react-router";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { projectDetailQuery } from "@/queries/planning";
import ProjectItemSection from "@/components/ProjectItem";

export default function ProjectItemListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useApiQuery(projectDetailQuery(projectId));
  const project = projectQuery.data;
  const loading = projectQuery.isLoading;
  if (projectQuery.isError && !project) {
    return (
      <div role="alert">
        {projectQuery.error.message}
        <button onClick={() => void projectQuery.refetch()}>重试</button>
      </div>
    );
  }

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
