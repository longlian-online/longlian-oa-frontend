import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { MY_TASK_PAGE_SIZE as PAGE_SIZE, myTasksQuery } from "@/queries/workshop";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MyTaskBucket, MyTaskSortDirection } from "@/types/myTask";

function formatClaimedAt(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "";
  return `${match[2]}-${match[3]}`;
}

interface MyTaskColumnProps {
  bucket: MyTaskBucket;
  title: string;
  dotClassName: string;
  sortDirection: MyTaskSortDirection;
}

export function MyTaskColumn({ bucket, title, dotClassName, sortDirection }: MyTaskColumnProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [sortDirection]);

  const tasksQuery = useApiQuery(myTasksQuery(bucket, page, sortDirection));
  const tasks = tasksQuery.data?.list ?? [];
  const total = tasksQuery.data?.total ?? 0;
  const loading = tasksQuery.isLoading;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const submittable = bucket === "SUBMITTABLE";

  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <span className={cn("size-1.5 rounded-full", dotClassName)} aria-hidden />
        {title}
        {!loading && <span className="font-normal text-muted-foreground">{total}</span>}
      </h3>

      <div className="flex flex-1 flex-col">
        {tasksQuery.isError && !tasksQuery.data ? (
          <Button variant="ghost" size="sm" onClick={() => void tasksQuery.refetch()}>
            加载失败，重试
          </Button>
        ) : loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">加载中...</p>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">暂无任务</p>
        ) : (
          tasks.map((task) => {
            const action = submittable ? "去提交" : "看进度";
            return (
              <button
                key={task.instanceId}
                type="button"
                className="group flex w-full min-w-0 flex-col gap-0.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/70"
                aria-label={`${task.projectName} ${task.itemTitle} ${task.nodeName}，${action}`}
                onClick={() =>
                  void navigate(`/dashboard/planning/${task.projectId}/items/${task.itemId}`)
                }
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="max-w-[45%] shrink-0 truncate text-sm font-medium text-foreground">
                    {task.projectName}
                  </span>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {task.itemTitle} · {task.nodeName}
                  </span>
                </span>
                <span className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  {!submittable && (
                    <span className="mr-auto truncate">
                      {task.waitingStageName ? `等${task.waitingStageName}` : "等待中"}
                    </span>
                  )}
                  <span className="tabular-nums">{formatClaimedAt(task.claimedAt)}</span>
                  <ChevronRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2 text-xs text-muted-foreground">
          <span className="mr-auto tabular-nums">
            {start}–{end} / {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={loading || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={loading || page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </section>
  );
}
