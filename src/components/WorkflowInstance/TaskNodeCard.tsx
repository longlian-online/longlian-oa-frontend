import { CheckCircle2, Circle, Clock, Lock, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getWorkflowTaskIcon } from "@/lib/workflowVisuals";
import type {
  ItemTaskInstanceVO,
  ItemTaskNodeVO,
  TaskInstanceStatus,
} from "@/types/workflowInstance";

interface TaskNodeCardProps {
  node: ItemTaskNodeVO;
  instance?: ItemTaskInstanceVO;
  currentUserId?: string | null;
  mutating: boolean;
  onClaim: (instanceId: string) => void;
  onSubmit: (instance: ItemTaskInstanceVO, node: ItemTaskNodeVO) => void;
}

const STATUS_LABELS: Record<TaskInstanceStatus, string> = {
  PENDING: "待接取",
  CLAIMED: "处理中",
  COMPLETED: "已完成",
};

function getNodeStyle(status?: TaskInstanceStatus | null) {
  if (status === "COMPLETED") {
    return { icon: CheckCircle2, className: "border-primary/35", badge: "secondary" as const };
  }
  if (status === "CLAIMED") {
    return { icon: Clock, className: "border-primary shadow-sm", badge: "default" as const };
  }
  if (status === "PENDING") {
    return { icon: Circle, className: "border-primary/45", badge: "outline" as const };
  }
  return {
    icon: Lock,
    className: "border-border bg-muted/30 opacity-75",
    badge: "secondary" as const,
  };
}

export default function TaskNodeCard({
  node,
  instance,
  currentUserId,
  mutating,
  onClaim,
  onSubmit,
}: TaskNodeCardProps) {
  const status = node.taskStatus ?? instance?.status ?? null;
  const style = getNodeStyle(status);
  const StatusIcon = style.icon;
  const TaskIcon = getWorkflowTaskIcon(node.name, node.baseTaskIconName);
  const isAssignedToMe = Boolean(instance?.assigneeId && instance.assigneeId === currentUserId);
  const initials = instance?.assigneeNickname?.slice(0, 1) || "?";

  return (
    <article className={cn("w-60 rounded-xl border bg-card p-3.5 shadow-sm", style.className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <StatusIcon className="size-4" />
          <span className="text-xs">阶段 {node.sort}</span>
        </div>
        <Badge variant={style.badge}>{status ? STATUS_LABELS[status] : "未解锁"}</Badge>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-primary">
          {node.baseTaskIconUrl ? (
            <img src={node.baseTaskIconUrl} alt="" className="size-full object-cover" />
          ) : (
            <TaskIcon className="size-3.5" />
          )}
        </div>
        <h3 className="truncate text-sm font-semibold text-foreground">{node.name}</h3>
      </div>
      <div className="mt-2 flex min-h-8 items-center gap-2">
        {instance?.assigneeNickname ? (
          <>
            <Avatar size="sm">
              {instance.assigneeAvatarUrl && (
                <AvatarImage src={instance.assigneeAvatarUrl} alt="" />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">
              {instance.assigneeNickname}
              {isAssignedToMe ? "（我）" : ""}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserRound className="size-4" />
            {status === "PENDING" ? "等待成员接取" : "暂无执行人"}
          </span>
        )}
      </div>

      <div className="mt-3 flex min-h-7 items-center">
        {status === "PENDING" && instance && (
          <Button
            size="xs"
            className="w-full"
            disabled={mutating}
            onClick={() => onClaim(instance.id)}
          >
            接取任务
          </Button>
        )}
        {status === "CLAIMED" && isAssignedToMe && instance && (
          <Button
            size="xs"
            className="w-full"
            disabled={mutating}
            onClick={() => onSubmit(instance, node)}
          >
            提交任务
          </Button>
        )}
        {status === "CLAIMED" && !isAssignedToMe && (
          <span className="text-xs text-muted-foreground">其他成员处理中</span>
        )}
        {status === "COMPLETED" && (
          <span className="text-xs text-muted-foreground">该任务已完成</span>
        )}
        {!status && <span className="text-xs text-muted-foreground">完成前置阶段后解锁</span>}
      </div>
    </article>
  );
}
