import { CheckCircle2, Circle, Clock, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ItemTaskInstanceVO,
  ItemTaskNodeVO,
  TaskInstanceStatus,
} from "@/types/workflowInstance";

interface TaskNodeCardProps {
  node: ItemTaskNodeVO;
  instance?: ItemTaskInstanceVO;
  currentUserId?: string | null;
  mutating?: boolean;
  onClaim: (instanceId: string) => void;
  onSubmit: (instance: ItemTaskInstanceVO, node: ItemTaskNodeVO) => void;
}

const STATUS_LABELS: Record<TaskInstanceStatus, string> = {
  PENDING: "待接取",
  CLAIMED: "待提交",
  COMPLETED: "已完成",
};

function getNodeStyle(status?: TaskInstanceStatus | null) {
  if (status === "COMPLETED") {
    return {
      icon: CheckCircle2,
      className: "border-foreground bg-foreground text-background",
      badgeVariant: "secondary" as const,
    };
  }

  if (status === "CLAIMED") {
    return {
      icon: Clock,
      className: "border-foreground bg-background text-foreground",
      badgeVariant: "default" as const,
    };
  }

  if (status === "PENDING") {
    return {
      icon: Circle,
      className: "border-border bg-background text-foreground",
      badgeVariant: "outline" as const,
    };
  }

  return {
    icon: Lock,
    className: "border-border bg-muted/40 text-muted-foreground",
    badgeVariant: "secondary" as const,
  };
}

export default function TaskNodeCard({
  node,
  instance,
  currentUserId,
  mutating = false,
  onClaim,
  onSubmit,
}: TaskNodeCardProps) {
  const status = node.taskStatus ?? instance?.status ?? null;
  const nodeStyle = getNodeStyle(status);
  const StatusIcon = nodeStyle.icon;
  const isAssignedToMe = Boolean(instance?.assigneeId && instance.assigneeId === currentUserId);
  const claimableInstance = status === "PENDING" ? instance : undefined;
  const submittableInstance = status === "CLAIMED" && isAssignedToMe ? instance : undefined;

  return (
    <article className={cn("w-48 rounded-xl border p-3 shadow-sm", nodeStyle.className)}>
      <div className="flex items-center justify-between gap-2">
        <StatusIcon className="h-4 w-4 shrink-0" />
        <Badge variant={nodeStyle.badgeVariant}>{status ? STATUS_LABELS[status] : "未解锁"}</Badge>
      </div>
      <div className="mt-3 min-h-10">
        <h3 className="truncate text-sm font-semibold">{node.name}</h3>
        <p className="mt-1 truncate text-xs opacity-70">
          {instance?.assigneeNickname || (status === "PENDING" ? "等待接取" : "暂无执行人")}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        {claimableInstance && (
          <Button
            size="xs"
            className="flex-1"
            disabled={mutating}
            onClick={() => onClaim(claimableInstance.id)}
          >
            接取
          </Button>
        )}
        {submittableInstance && (
          <Button
            size="xs"
            variant="secondary"
            className="flex-1"
            disabled={mutating}
            onClick={() => onSubmit(submittableInstance, node)}
          >
            提交
          </Button>
        )}
        {!claimableInstance && !submittableInstance && (
          <span className="text-xs opacity-70">
            {status === "CLAIMED" && !isAssignedToMe ? "其他成员处理中" : "暂无操作"}
          </span>
        )}
      </div>
    </article>
  );
}
