import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Layers2 } from "lucide-react";

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
}

export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;

function WorkflowNode({ id, data }: NodeProps<WorkflowFlowNode>) {
  const Icon = getWorkflowTaskIcon(data.taskName, data.iconName);
  const description = getWorkflowTaskDescription(data.taskName, data.description);

  return (
    <button
      type="button"
      className={cn(
        "group w-56 rounded-xl border bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow,transform]",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        data.selected && "border-primary ring-2 ring-primary/15",
      )}
      onClick={() => data.onSelect(id)}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-1.5 !border-0 !bg-border"
      />
      <div className="flex items-start gap-3">
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
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-1.5 !border-0 !bg-border"
      />
    </button>
  );
}

export default memo(WorkflowNode);
