import { useState } from "react";
import { CalendarClock, Loader2, Play } from "lucide-react";

import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { triggerScheduledTask } from "@/api/admin";
import { scheduledTasksQuery } from "@/queries/admin";
import AdminLayout from "@/components/AdminLayout";
import DateTimeField from "@/components/DateTimeField";
import EmptyState from "@/components/EmptyState";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ScheduledTaskVO } from "@/types/admin";

export default function ScheduledTasksPage() {
  const triggerScheduledTaskMutation = useApiMutation<
    Awaited<ReturnType<typeof triggerScheduledTask>>,
    Parameters<typeof triggerScheduledTask>
  >({
    mutationFn: (args) => triggerScheduledTask(...args),
    invalidate: [["scheduledTasks"]],
    scope: "admin",
  });
  const tasksQuery = useApiQuery(scheduledTasksQuery());
  const tasks = tasksQuery.data ?? [];
  const loading = tasksQuery.isLoading;
  const triggering = triggerScheduledTaskMutation.isPending;
  const [selectedTask, setSelectedTask] = useState<ScheduledTaskVO | null>(null);
  const [executeTime, setExecuteTime] = useState("");

  async function handleTrigger(): Promise<void> {
    try {
      if (!selectedTask) return;
      await triggerScheduledTaskMutation.mutateAsync([
        selectedTask.taskName,
        executeTime ? { executeTime: new Date(executeTime).toISOString() } : {},
      ]);
      $tip("定时任务已触发", "success");
      setSelectedTask(null);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <AdminLayout title="定时任务" description="查看后台已注册任务，必要时手动触发执行。">
      <Card>
        <CardContent className="p-4 sm:p-6">
          {tasksQuery.isError && !tasksQuery.data ? (
            <Button onClick={() => void tasksQuery.refetch()}>加载失败，重试</Button>
          ) : loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载中...
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="size-5 text-muted-foreground" />}
              title="暂无定时任务"
              description="系统当前没有返回已注册的后台任务。"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务名称</TableHead>
                  <TableHead>说明</TableHead>
                  <TableHead>Cron</TableHead>
                  <TableHead>调度状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.taskName}>
                    <TableCell className="font-medium">{task.taskName}</TableCell>
                    <TableCell>{task.description || "—"}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">
                        {task.cronExpression || "手动触发"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.enabled ? "default" : "secondary"}>
                        {task.enabled ? "已启用" : "未启用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExecuteTime("");
                          setSelectedTask(task);
                        }}
                      >
                        <Play className="size-4" />
                        手动触发
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={selectedTask !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>手动触发任务</DialogTitle>
            <DialogDescription>
              任务：{selectedTask?.taskName}。不填写时间时按当前时间执行。
            </DialogDescription>
          </DialogHeader>
          <DateTimeField
            mode="datetime"
            ariaLabel="执行时间"
            value={executeTime}
            onChange={setExecuteTime}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedTask(null)}>
              取消
            </Button>
            <Button type="button" disabled={triggering} onClick={() => void handleTrigger()}>
              {triggering && <Loader2 className="size-4 animate-spin" />}确认触发
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
