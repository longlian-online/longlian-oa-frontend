import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Layers2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getWorkflowTaskDescription, getWorkflowTaskIcon } from "@/lib/workflowVisuals";

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  taskName: string;
  description?: string;
  iconName?: string;
  iconUrl?: string;
  stage: number;
  parallelCount: number;
  selected: boolean;
  onSelect: (localId: string) => void;
  onRemove: (localId: string) => void;
}

export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;

function WorkflowNode({ id, data }: NodeProps<WorkflowFlowNode>) {
  const Icon = getWorkflowTaskIcon(data.taskName, data.iconName);
  const description = getWorkflowTaskDescription(data.taskName, data.description);

  return (
    <div
      className={cn(
        "group relative w-56 rounded-xl border bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow,transform]",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        data.selected && "border-primary ring-2 ring-primary/15",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-1.5 !border-0 !bg-border"
      />
      <button
        type="button"
        className="block w-full text-left outline-none"
        onClick={() => data.onSelect(id)}
      >
        <div className="flex items-start gap-3 pr-6">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
            {data.iconUrl ? (
              <img src={data.iconUrl} alt="" className="size-full object-cover" />
            ) : (
              <Icon className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{data.label}</div>
            {description && (
              <div className="mt-1 truncate text-xs leading-4 text-muted-foreground">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <Badge variant="outline">阶段 {data.stage}</Badge>
          {data.parallelCount > 1 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers2 className="size-3.5" />
              {data.parallelCount} 个并行
            </span>
          )}
        </div>
      </button>
      <button
        type="button"
        aria-label={`删除${data.label}节点`}
        title="删除节点"
        className="nodrag nopan absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          event.stopPropagation();
          data.onRemove(id);
        }}
      >
        <Trash2 className="size-3.5" />
      </button>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-1.5 !border-0 !bg-border"
      />
    </div>
  );
}

export default memo(WorkflowNode);
