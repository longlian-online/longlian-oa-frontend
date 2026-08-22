import { Eye, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ItemTaskInstanceVO, TaskInstanceStatus } from "@/types/workflowInstance";

interface TaskActionPanelProps {
  instances: ItemTaskInstanceVO[];
  currentUserId?: string | null;
  mutatingInstanceId?: string | null;
  onSubmit: (instance: ItemTaskInstanceVO) => void;
  onClaim: (instanceId: string) => void;
  onAbandon: (instanceId: string) => void;
  onReject: (instance: ItemTaskInstanceVO) => void;
  onReset: (instanceId: string) => void;
  onViewDetail: (instance: ItemTaskInstanceVO) => void;
}

const STATUS_LABELS: Record<TaskInstanceStatus, string> = {
  PENDING: "待接取",
  CLAIMED: "待提交",
  COMPLETED: "已完成",
};

function getStatusVariant(status: TaskInstanceStatus): "default" | "secondary" | "outline" {
  if (status === "COMPLETED") return "secondary";
  if (status === "CLAIMED") return "default";
  return "outline";
}

export default function TaskActionPanel({
  instances,
  currentUserId,
  mutatingInstanceId,
  onSubmit,
  onClaim,
  onAbandon,
  onReject,
  onReset,
  onViewDetail,
}: TaskActionPanelProps) {
  if (instances.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        暂无已生成任务实例。前置并行组全部完成后，后续任务会解锁生成。
      </div>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 text-sm font-medium text-foreground">任务列表</div>
      <div className="space-y-2">
        {instances.map((instance) => {
          const isMine = Boolean(instance.assigneeId && instance.assigneeId === currentUserId);
          const isMutating = mutatingInstanceId === instance.id;

          return (
            <div
              key={instance.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {instance.name}
                  </h3>
                  <Badge variant={getStatusVariant(instance.status)}>
                    {STATUS_LABELS[instance.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {instance.assigneeNickname || "待接取"} · 第 {instance.sort} 组
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {instance.status === "PENDING" && (
                  <Button size="xs" disabled={isMutating} onClick={() => onClaim(instance.id)}>
                    {isMutating && <Loader2 className="h-3 w-3 animate-spin" />}
                    接取
                  </Button>
                )}
                {instance.status === "CLAIMED" && isMine && (
                  <>
                    <Button size="xs" disabled={isMutating} onClick={() => onSubmit(instance)}>
                      提交
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isMutating}
                      onClick={() => onAbandon(instance.id)}
                    >
                      放弃
                    </Button>
                  </>
                )}
                {instance.status === "COMPLETED" && (
                  <>
                    <Button size="xs" variant="outline" onClick={() => onViewDetail(instance)}>
                      <Eye className="h-3 w-3" />
                      详情
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isMutating}
                      onClick={() => onReset(instance.id)}
                    >
                      重置
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      disabled={isMutating}
                      onClick={() => onReject(instance)}
                    >
                      打回
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
