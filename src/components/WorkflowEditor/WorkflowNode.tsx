import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import { getNodeLabel, type WorkflowEditorNode } from "./utils";

interface WorkflowNodeProps {
  node: WorkflowEditorNode;
  baseTasks: BaseTaskVO[];
  onDragStart: (localId: string) => void;
  onRename: (localId: string, customName: string) => void;
  onRemove: (localId: string) => void;
}

export default function WorkflowNode({
  node,
  baseTasks,
  onDragStart,
  onRename,
  onRemove,
}: WorkflowNodeProps) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", node.localId);
        onDragStart(node.localId);
      }}
      className="w-40 cursor-grab rounded-xl border bg-background p-3 shadow-sm transition-colors active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="truncate">{getNodeLabel(node, baseTasks)}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="删除节点"
          onClick={() => onRemove(node.localId)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Input
        value={node.customName}
        placeholder="自定义名称"
        className="h-7 text-xs"
        onChange={(event) => onRename(node.localId, event.target.value)}
      />
    </div>
  );
}
