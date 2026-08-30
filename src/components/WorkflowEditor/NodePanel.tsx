import { useMemo, useState, type DragEvent } from "react";
import { Loader2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getWorkflowTaskDescription, getWorkflowTaskIcon } from "@/lib/workflowVisuals";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import { WORKFLOW_TASK_DRAG_TYPE } from "./utils";

interface NodePanelProps {
  baseTasks: BaseTaskVO[];
  loadingBaseTasks: boolean;
  onAddNode: (baseTaskId: string) => void;
}

export default function NodePanel({ baseTasks, loadingBaseTasks, onAddNode }: NodePanelProps) {
  const [keyword, setKeyword] = useState("");
  const filteredTasks = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase();
    if (!query) return baseTasks;
    return baseTasks.filter(
      (task) =>
        task.name.toLocaleLowerCase().includes(query) ||
        task.description?.toLocaleLowerCase().includes(query),
    );
  }, [baseTasks, keyword]);

  function handleDragStart(event: DragEvent<HTMLButtonElement>, taskId: string): void {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(WORKFLOW_TASK_DRAG_TYPE, taskId);
  }

  return (
    <aside className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div className="flex min-h-12 items-center gap-3 border-b px-4 py-2">
        <div className="flex shrink-0 items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">任务节点</h2>
          <Badge variant="secondary">{baseTasks.length}</Badge>
        </div>
        <p className="hidden text-xs text-muted-foreground lg:block">拖到下方流程区，或点击追加</p>
        <div className="relative ml-auto w-48 max-w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            placeholder="搜索任务"
            className="pl-9"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className="flex min-h-16 items-center gap-2 overflow-x-auto px-3 py-2">
        {loadingBaseTasks ? (
          <div className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在加载
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex w-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            没有找到匹配的任务
          </div>
        ) : (
          filteredTasks.map((task) => {
            const Icon = getWorkflowTaskIcon(task.name);
            const description = getWorkflowTaskDescription(task.name, task.description);

            return (
              <button
                key={task.id}
                type="button"
                draggable
                aria-label={`添加${task.name}节点`}
                title={
                  description ? `${task.name}：${description}` : "拖到下方流程区，或点击添加到末尾"
                }
                className="group inline-flex h-10 max-w-44 shrink-0 cursor-grab items-center gap-2 rounded-full border bg-background px-2.5 text-left transition-[border-color,box-shadow] hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm active:cursor-grabbing"
                onClick={() => onAddNode(String(task.id))}
                onDragStart={(event) => handleDragStart(event, String(task.id))}
              >
                <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                  {task.iconUrl ? (
                    <img src={task.iconUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </div>
                <span className="truncate text-sm font-medium text-foreground">{task.name}</span>
                <Plus className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
