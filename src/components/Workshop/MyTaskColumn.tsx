import { useLocation, useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { MY_TASK_PAGE_SIZE as PAGE_SIZE, myTasksQuery } from "@/queries/workshop";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSlotLabel, formatTaskTitle } from "@/lib/slotLabel";
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
  page: number;
  onPageChange: (page: number) => void;
}

export function MyTaskColumn({
  bucket,
  title,
  dotClassName,
  sortDirection,
  page,
  onPageChange,
}: MyTaskColumnProps) {
  const navigate = useNavigate();
  const location = useLocation();

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
            const titleText = formatTaskTitle(task.itemTitle, {
              name: task.nodeName,
              slotIndex: task.slotIndex,
              slotTotal: task.slotTotal,
              serialStep: task.serialStep,
            });
            const waitingText = task.waitingStageName
              ? `等${formatSlotLabel({
                  name: task.waitingStageName,
                  slotIndex: task.waitingSlotIndex,
                  slotTotal: task.waitingSlotTotal,
                  serialStep: task.waitingSerialStep,
                })}`
              : "等待中";
            return (
              <button
                key={task.instanceId}
                type="button"
                className="group flex w-full min-w-0 flex-col gap-0.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted/70"
                aria-label={`${titleText}，${task.projectName}，${action}`}
                onClick={() => {
                  const params = new URLSearchParams({
                    taskInstanceId: task.instanceId,
                  });
                  void navigate(
                    `/dashboard/planning/${task.projectId}/items/${task.itemId}?${params}`,
                    {
                      state: { workshopReturnTo: `${location.pathname}${location.search}` },
                    },
                  );
                }}
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {titleText}
                </span>
                <span className="flex min-w-0 items-center justify-end gap-2 text-xs text-muted-foreground">
                  {!submittable && (
                    <span className="mr-auto inline-block max-w-full truncate rounded-full bg-[#fcede1] px-2.5 py-0.5 font-medium text-[#c45628] dark:bg-[#3a241c] dark:text-[#f3b08a]">
                      {waitingText}
                    </span>
                  )}
                  <span className="min-w-0 truncate">{task.projectName}</span>
                  <span className="shrink-0 tabular-nums">{formatClaimedAt(task.claimedAt)}</span>
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
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </section>
  );
}
