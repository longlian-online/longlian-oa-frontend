import { CheckCircle2, Circle, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ItemTaskNodeVO, TaskInstanceStatus } from "@/types/planning";

interface TaskFlowViewerProps {
  nodes: ItemTaskNodeVO[];
  currentUserId?: number;
  rejectedNodes?: { nodeId: number; reason: string }[];
  onClaim?: (nodeId: number) => void;
  onSubmit?: (nodeId: number) => void;
  onReject?: (nodeId: number) => void;
}

interface GroupedNode {
  sort: number;
  nodes: ItemTaskNodeVO[];
}

// 按 sort 分组节点
function groupNodesBySort(nodes: ItemTaskNodeVO[]): GroupedNode[] {
  const groups = new Map<number, ItemTaskNodeVO[]>();

  for (const node of nodes) {
    const list = groups.get(node.sort) || [];
    list.push(node);
    groups.set(node.sort, list);
  }

  // 按 sort 排序，按 parallelSort 排序组内节点
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([sort, groupNodes]) => ({
      sort,
      nodes: groupNodes.sort((a, b) => a.parallelSort - b.parallelSort),
    }));
}

// 获取状态样式
function getStatusStyle(status: TaskInstanceStatus | null | undefined) {
  switch (status) {
    case "COMPLETED":
      return {
        border: "border-green-500",
        bg: "bg-green-50 dark:bg-green-950",
        icon: CheckCircle2,
        iconColor: "text-green-500",
        badge: "已完成",
        badgeVariant: "secondary" as const,
      };
    case "CLAIMED":
      return {
        border: "border-orange-500",
        bg: "bg-orange-50 dark:bg-orange-950",
        icon: Clock,
        iconColor: "text-orange-500",
        badge: "进行中",
        badgeVariant: "default" as const,
      };
    case "PENDING":
      return {
        border: "border-blue-500",
        bg: "bg-blue-50 dark:bg-blue-950",
        icon: Circle,
        iconColor: "text-blue-500",
        badge: "待接取",
        badgeVariant: "outline" as const,
      };
    default:
      return {
        border: "border-gray-300",
        bg: "bg-gray-50 dark:bg-gray-900",
        icon: Lock,
        iconColor: "text-gray-400",
        badge: "未解锁",
        badgeVariant: "secondary" as const,
      };
  }
}

// 单个节点卡片
function TaskNodeCard({
  node,
  currentUserId,
  rejectedInfo,
  onClaim,
  onSubmit,
}: {
  node: ItemTaskNodeVO;
  currentUserId?: number;
  rejectedInfo?: { reason: string };
  onClaim?: (nodeId: number) => void;
  onSubmit?: (nodeId: number) => void;
}) {
  const style = getStatusStyle(node.taskStatus);
  const StatusIcon = style.icon;
  const isAssignedToMe = node.assigneeId === currentUserId;
  const isRejected = !!rejectedInfo;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex w-48 flex-col gap-2 rounded-lg border-2 p-4 transition-all",
          isRejected ? "border-red-500 bg-red-50 dark:bg-red-950" : style.border,
          isRejected ? "" : style.bg,
          node.taskStatus === null && !isRejected && "opacity-60",
        )}
      >
        {/* 状态图标 */}
        <div className="flex items-center justify-between">
          <StatusIcon className={cn("h-5 w-5", isRejected ? "text-red-500" : style.iconColor)} />
          {isRejected ? (
            <Badge variant="destructive">被打回</Badge>
          ) : (
            <Badge variant={style.badgeVariant}>{style.badge}</Badge>
          )}
        </div>

        {/* 节点名称 */}
        <div className="font-medium">{node.name}</div>

        {/* 执行人信息 */}
        {node.assigneeId ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={node.assigneeAvatarUrl} />
              <AvatarFallback className="text-xs">
                {node.assigneeNickname?.slice(0, 1) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground text-sm">{node.assigneeNickname}</span>
          </div>
        ) : (
          <div className="text-muted-foreground h-6 text-sm">待分配</div>
        )}

        {/* 操作按钮 */}
        {node.taskStatus === "PENDING" && onClaim && (
          <Button size="sm" className="mt-2 w-full" onClick={() => onClaim(node.id)}>
            接取任务
          </Button>
        )}

        {node.taskStatus === "CLAIMED" && isAssignedToMe && onSubmit && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => onSubmit(node.id)}
          >
            提交任务
          </Button>
        )}

        {/* 打回理由提示 */}
        {isRejected && rejectedInfo && (
          <Tooltip>
            <TooltipTrigger>
              <div className="absolute right-2 top-2 h-2 w-2 cursor-help rounded-full bg-red-500" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs font-medium">打回理由:</p>
              <p className="text-xs">{rejectedInfo.reason}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 悬停提示：元数据字段 */}
        {node.metaSchema && !isRejected && (
          <Tooltip>
            <TooltipTrigger>
              <div className="absolute right-2 top-2 h-2 w-2 cursor-help rounded-full bg-current opacity-0 hover:opacity-100" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">需要提交: {node.metaSchema}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// 连接节点之间的线
function ConnectorLine({ isActive, isRejected }: { isActive?: boolean; isRejected?: boolean }) {
  return (
    <div className="flex h-8 items-center justify-center">
      <div
        className={cn(
          "w-0.5 flex-1",
          isRejected
            ? "border-l-2 border-red-500 border-dashed bg-transparent w-0"
            : isActive
              ? "bg-primary"
              : "bg-border",
        )}
      />
    </div>
  );
}

export function TaskFlowViewer({
  nodes,
  currentUserId,
  rejectedNodes = [],
  onClaim,
  onSubmit,
}: TaskFlowViewerProps) {
  const groupedNodes = groupNodesBySort(nodes);

  if (nodes.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">暂无任务节点</div>;
  }

  return (
    <div className="flex flex-col items-center py-4">
      {groupedNodes.map((group, groupIndex) => (
        <div key={group.sort} className="w-full">
          {/* 连接线（第一组不显示） */}
          {groupIndex > 0 && (
            <ConnectorLine
              isActive={group.nodes.some(
                (n) => n.taskStatus !== null || rejectedNodes.some((r) => r.nodeId === n.id),
              )}
              isRejected={group.nodes.some((n) => rejectedNodes.some((r) => r.nodeId === n.id))}
            />
          )}

          {/* 节点组 */}
          <div
            className={cn(
              "flex gap-4",
              group.nodes.length > 1 ? "flex-row justify-center" : "flex-col items-center",
            )}
          >
            {group.nodes.map((node) => (
              <TaskNodeCard
                key={node.id}
                node={node}
                currentUserId={currentUserId}
                rejectedInfo={rejectedNodes.find((r) => r.nodeId === node.id)}
                onClaim={onClaim}
                onSubmit={onSubmit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
