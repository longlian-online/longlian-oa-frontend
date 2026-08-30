import { ArrowDown, ArrowUp, Layers2, PanelRight, Split, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getWorkflowTaskDescription } from "@/lib/workflowVisuals";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import { getNodeLabel, type WorkflowEditorNode } from "./utils";

interface NodeInspectorProps {
  node?: WorkflowEditorNode;
  baseTasks: BaseTaskVO[];
  onRename: (localId: string, customName: string) => void;
  onRemove: (localId: string) => void;
  onMakeParallel: (localId: string) => void;
  onSplitStage: (localId: string) => void;
  onMoveUp: (localId: string) => void;
  onMoveDown: (localId: string) => void;
}

export default function NodeInspector({
  node,
  baseTasks,
  onRename,
  onRemove,
  onMakeParallel,
  onSplitStage,
  onMoveUp,
  onMoveDown,
}: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="flex min-h-[520px] w-72 shrink-0 flex-col items-center justify-center rounded-2xl border bg-card px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <PanelRight className="size-5" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">选择一个节点</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          在这里修改名称、阶段和并行关系
        </p>
      </aside>
    );
  }

  const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
  const description = baseTask
    ? getWorkflowTaskDescription(baseTask.name, baseTask.description)
    : undefined;

  return (
    <aside className="flex min-h-[520px] w-72 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="border-b p-4">
        <p className="text-xs font-medium text-muted-foreground">节点属性</p>
        <h2 className="mt-1 truncate text-base font-semibold text-foreground">
          {getNodeLabel(node, baseTasks)}
        </h2>
        <div className="mt-3 flex gap-2">
          <Badge variant="outline">阶段 {node.sort}</Badge>
          <Badge variant="secondary">并行序号 {node.parallelSort}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          节点名称
          <Input
            value={node.customName}
            placeholder={baseTask?.name || "请输入节点名称"}
            onChange={(event) => onRename(node.localId, event.target.value)}
          />
        </label>

        <div>
          <p className="text-sm font-medium text-foreground">基础任务</p>
          <p className="mt-2 text-sm text-muted-foreground">{baseTask?.name || "未知任务"}</p>
          {description && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">流程位置</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMoveUp(node.localId)}
            >
              <ArrowUp data-icon="inline-start" />
              前移
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMoveDown(node.localId)}
            >
              <ArrowDown data-icon="inline-start" />
              后移
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMakeParallel(node.localId)}
            >
              <Layers2 data-icon="inline-start" />
              并入上组
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSplitStage(node.localId)}
            >
              <Split data-icon="inline-start" />
              独立阶段
            </Button>
          </div>
        </div>

        <div className="mt-auto">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => onRemove(node.localId)}
          >
            <Trash2 data-icon="inline-start" />
            删除节点
          </Button>
        </div>
      </div>
    </aside>
  );
}
