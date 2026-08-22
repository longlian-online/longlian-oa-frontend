import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import WorkflowInstance from "@/components/WorkflowInstance";
import { Button } from "@/components/ui/button";

export default function ProjectItemTaskPage() {
  const navigate = useNavigate();
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();

  if (!projectId || !itemId) {
    return <div className="py-8 text-center text-sm text-muted-foreground">项目不存在</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="返回企划"
          onClick={() => void navigate(`/dashboard/planning/${projectId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">项目任务流</h1>
          <p className="text-sm text-muted-foreground">查看节点状态并处理当前任务。</p>
        </div>
      </div>

      <WorkflowInstance itemId={itemId} />
    </div>
  );
}
