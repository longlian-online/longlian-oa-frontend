import { useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { BaseTaskVO } from "@/types/workflowTemplate";

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

  return (
    <aside className="flex min-h-[520px] w-64 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">任务节点</h2>
            <p className="mt-1 text-xs text-muted-foreground">点击添加到流程末尾</p>
          </div>
          <Badge variant="secondary">{baseTasks.length}</Badge>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            placeholder="搜索任务"
            className="pl-9"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {loadingBaseTasks ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在加载
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            没有找到匹配的任务
          </div>
        ) : (
          filteredTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className="group rounded-xl border bg-background p-3 text-left transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm"
              onClick={() => onAddNode(String(task.id))}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                  {task.iconUrl ? (
                    <img src={task.iconUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{task.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
                    {task.description || "暂无任务说明"}
                  </p>
                </div>
                <Plus className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
