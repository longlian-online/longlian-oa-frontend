import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { getMyTasks } from "@/api/myTask";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MyTaskBucket, MyTaskInstanceVO, MyTaskSortDirection } from "@/types/myTask";

const PAGE_SIZE = 5;

interface MyTaskColumnProps {
  bucket: MyTaskBucket;
  title: string;
  dotClassName: string;
  sortDirection: MyTaskSortDirection;
}

export function MyTaskColumn({ bucket, title, dotClassName, sortDirection }: MyTaskColumnProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<MyTaskInstanceVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [sortDirection]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyTasks({ bucket, pageNum: page, pageSize: PAGE_SIZE, sortDirection })
      .then((data) => {
        if (!active) return;
        setTasks(data.list);
        setTotal(data.total);
      })
      .catch(() => {
        if (!active) return;
        setTasks([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bucket, page, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const submittable = bucket === "SUBMITTABLE";

  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <span className={cn("size-1.5 rounded-full", dotClassName)} aria-hidden />
        {title}
      </h3>

      <div className="flex flex-1 flex-col gap-2">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">加载中...</p>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">暂无任务</p>
        ) : (
          tasks.map((task) => (
            <article key={task.instanceId} className="rounded-lg bg-muted/50 p-2.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {task.itemTitle} · {task.nodeName}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {submittable ? task.projectName : `等待${task.waitingStageName ?? "前置阶段"}`}
              </p>
              <Button
                size="sm"
                variant={submittable ? "default" : "outline"}
                className="mt-2 h-6 px-2 text-xs"
                onClick={() =>
                  void navigate(`/dashboard/planning/${task.projectId}/items/${task.itemId}`)
                }
              >
                {submittable ? "去提交" : "看进度"}
              </Button>
            </article>
          ))
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            {start}–{end} / {total}
          </span>
          <div className="flex gap-1">
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
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={loading || page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
