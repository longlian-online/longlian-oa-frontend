import { useParams } from "react-router";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { projectDetailQuery } from "@/queries/planning";
import CreateProject from "@/pages/dashboard/planning/create";

export default function EditProjectPage() {
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

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  if (!project) {
    return <div className="py-8 text-center text-sm text-muted-foreground">企划不存在</div>;
  }

  if (!project.isCreator) {
    return <div className="py-8 text-center text-sm text-muted-foreground">无权编辑该企划</div>;
  }

  return <CreateProject key={project.id} project={project} />;
}
