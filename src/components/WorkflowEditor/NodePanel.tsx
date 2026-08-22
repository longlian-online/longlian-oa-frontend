import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import { getNodeLabel, normalizeNodes, type WorkflowEditorNode } from "./utils";

interface NodePanelProps {
  nodes: WorkflowEditorNode[];
  baseTasks: BaseTaskVO[];
  selectedBaseTaskId: string;
  loadingBaseTasks: boolean;
  onSelectBaseTask: (baseTaskId: string) => void;
  onAddNode: () => void;
  onMakeParallel: (localId: string) => void;
  onSplitStage: (localId: string) => void;
  onMoveUp: (localId: string) => void;
  onMoveDown: (localId: string) => void;
}

export default function NodePanel({
  nodes,
  baseTasks,
  selectedBaseTaskId,
  loadingBaseTasks,
  onSelectBaseTask,
  onAddNode,
  onMakeParallel,
  onSplitStage,
  onMoveUp,
  onMoveDown,
}: NodePanelProps) {
  return (
    <aside className="flex h-[calc(100svh-12.75rem)] min-h-[360px] w-[320px] shrink-0 flex-col rounded-xl border bg-card px-5 py-4">
      <div className="mb-4 text-sm font-medium text-foreground">任务面板</div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">原子任务</label>
        {baseTasks.length > 0 ? (
          <Select
            value={selectedBaseTaskId}
            onValueChange={(value: string | null) => onSelectBaseTask(value || "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingBaseTasks ? "正在加载任务" : "选择任务"} />
            </SelectTrigger>
            <SelectContent>
              {baseTasks.map((task) => (
                <SelectItem key={task.id} value={String(task.id)}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={selectedBaseTaskId}
            disabled={loadingBaseTasks}
            placeholder="输入原子任务 ID"
            onChange={(event) => onSelectBaseTask(event.target.value)}
          />
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-9 justify-start gap-2"
        disabled={!selectedBaseTaskId}
        onClick={onAddNode}
      >
        <Plus data-icon="inline-start" />
        添加任务
      </Button>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-secondary/60 p-3">
        {loadingBaseTasks ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在加载
          </div>
        ) : nodes.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            还没有节点。选择一个原子任务后点击添加。
          </div>
        ) : (
          <div className="space-y-2">
            {normalizeNodes(nodes).map((node) => (
              <div key={node.localId} className="rounded-lg bg-background p-2">
                <div className="truncate text-sm font-medium text-foreground">
                  {getNodeLabel(node, baseTasks)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onMoveUp(node.localId)}
                  >
                    前移
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onMoveDown(node.localId)}
                  >
                    后移
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => onMakeParallel(node.localId)}
                  >
                    并入上组
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => onSplitStage(node.localId)}
                  >
                    独立
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
