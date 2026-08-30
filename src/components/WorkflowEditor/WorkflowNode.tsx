import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { GripVertical, Layers2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  iconUrl?: string;
  stage: number;
  parallelCount: number;
  selected: boolean;
  onSelect: (localId: string) => void;
}

export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;

function WorkflowNode({ id, data }: NodeProps<WorkflowFlowNode>) {
  return (
    <button
      type="button"
      className={cn(
        "group w-52 rounded-2xl border bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow,transform]",
        "hover:-translate-y-0.5 hover:shadow-md",
        data.selected && "border-primary ring-2 ring-primary/15",
      )}
      onClick={() => data.onSelect(id)}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
      />
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
          {data.iconUrl ? (
            <img src={data.iconUrl} alt="" className="size-full object-cover" />
          ) : (
            <GripVertical className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{data.label}</div>
          <div className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {data.description || "暂无任务说明"}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
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
        className="!size-2.5 !border-2 !border-background !bg-primary"
      />
    </button>
  );
}

export default memo(WorkflowNode);
