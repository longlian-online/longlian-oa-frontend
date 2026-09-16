import { useParams } from "react-router";

import WorkflowInstance from "@/components/WorkflowInstance";

export default function ProjectItemTaskPage() {
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();

  if (!projectId || !itemId) {
    return <div className="py-8 text-center text-sm text-muted-foreground">项目不存在</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <WorkflowInstance itemId={itemId} />
    </div>
  );
}
