import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { updateItemTaskFlow } from "@/api/workflowInstance";
import WorkflowEditor, { type WorkflowEditorNode } from "@/components/WorkflowEditor";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import {
  buildItemEditorNodes,
  toItemWorkflowUpdate,
  validateItemEditorNodes,
} from "@/lib/itemWorkflowEdit";
import { itemFlowQuery, projectDetailQuery } from "@/queries/planning";
import { baseTaskOptionsQuery } from "@/queries/workshop";

export default function EditItemWorkflowPage() {
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();
  if (!projectId || !itemId) {
    return <div className="py-8 text-center text-sm text-muted-foreground">项目不存在</div>;
  }
  return <EditItemWorkflow projectId={projectId} itemId={itemId} />;
}

function EditItemWorkflow({ projectId, itemId }: { projectId: string; itemId: string }) {
  const navigate = useNavigate();
  const projectQuery = useApiQuery(projectDetailQuery(projectId));
  const flowQuery = useApiQuery(itemFlowQuery(itemId));
  const baseTasksQuery = useApiQuery(baseTaskOptionsQuery());
  const original = flowQuery.data?.nodes ?? [];
  const [nodes, setNodes] = useState<WorkflowEditorNode[] | null>(null);
  const editorNodes = nodes ?? buildItemEditorNodes(original);
  const baseTasks = baseTasksQuery.data ?? [];
  const saveMutation = useApiMutation({
    mutationFn: () => updateItemTaskFlow(itemId, toItemWorkflowUpdate(original, editorNodes)),
    invalidate: [["flow"], ["instances"], ["items"], ["myTasks"], ["plaza"], ["projects"]],
  });
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const saving = saveMutation.isPending || saveSucceeded;
  const saveLock = useRef(false);

  async function handleSave(): Promise<void> {
    if (saveLock.current || saving) return;
    const validation = validateItemEditorNodes(editorNodes, baseTasks);
    if (!validation.valid) {
      $tip(validation.errors[0] || "工作流配置不完整", "error");
      return;
    }
    saveLock.current = true;
    let succeeded = false;
    try {
      await saveMutation.mutateAsync();
      succeeded = true;
      setSaveSucceeded(true);
      $tip("工作流已保存", "success");
      void navigate(`/dashboard/planning/${projectId}/items/${itemId}`);
    } catch {
      /* 失败保留画板草稿。 */
    } finally {
      if (!succeeded) saveLock.current = false;
    }
  }

  if (projectQuery.data && projectQuery.data.isCreator !== true) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <p>仅企划负责人可编辑项目工作流</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void navigate(`/dashboard/planning/${projectId}/items/${itemId}`)}
        >
          返回任务流
        </Button>
      </div>
    );
  }

  return (
    <div className="-mx-6 -mb-6 flex h-[calc(100svh-6.25rem)] flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <h1 className="text-lg font-bold leading-6 text-foreground">编辑工作流</h1>
        <div className="flex-1" />
        <Button
          type="button"
          disabled={saving || !flowQuery.data || !baseTasksQuery.data || editorNodes.length === 0}
          className="h-9 px-4"
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          保存
        </Button>
      </div>
      <div className="flex flex-1 items-start gap-4 overflow-hidden p-4">
        <WorkflowEditor
          value={editorNodes}
          baseTasks={baseTasks}
          loadingBaseTasks={baseTasksQuery.isLoading}
          onChange={setNodes}
        />
      </div>
    </div>
  );
}
