import { Fragment, useMemo } from "react";
import { Layers2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";
import TaskNodeCard from "./TaskNodeCard";

interface TaskFlowViewerProps {
  nodes: ItemTaskNodeVO[];
  instances: ItemTaskInstanceVO[];
  currentUserId?: string | null;
  mutatingInstanceId?: string | null;
  onClaim: (instanceId: string) => void;
  onSubmit: (instance: ItemTaskInstanceVO, node: ItemTaskNodeVO) => void;
}

interface NodeGroup {
  sort: number;
  nodes: ItemTaskNodeVO[];
}

function groupNodes(nodes: ItemTaskNodeVO[]): NodeGroup[] {
  const grouped = new Map<number, ItemTaskNodeVO[]>();
  nodes.forEach((node) => grouped.set(node.sort, [...(grouped.get(node.sort) ?? []), node]));
  return Array.from(grouped.entries())
    .sort(([prev], [next]) => prev - next)
    .map(([sort, group]) => ({
      sort,
      nodes: group.sort((prev, next) => prev.parallelSort - next.parallelSort),
    }));
}

function findInstance(node: ItemTaskNodeVO, instances: ItemTaskInstanceVO[]) {
  if (node.taskInstanceId) return instances.find((instance) => instance.id === node.taskInstanceId);
  return instances.find(
    (instance) => instance.sort === node.sort && instance.parallelSort === node.parallelSort,
  );
}

export default function TaskFlowViewer(props: TaskFlowViewerProps) {
  const groups = useMemo(() => groupNodes(props.nodes), [props.nodes]);

  if (groups.length === 0) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">
        暂无任务节点
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers2 className="size-4 text-muted-foreground" />
          流程进度
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {groups.map((group) => {
            const completed = group.nodes.filter((node) => node.taskStatus === "COMPLETED").length;
            const percentage = Math.round((completed / group.nodes.length) * 100);
            return (
              <div key={group.sort} className="flex items-center gap-2">
                <Badge variant={completed === group.nodes.length ? "secondary" : "outline"}>
                  阶段 {group.sort} · {completed}/{group.nodes.length}
                </Badge>
                <Progress
                  value={percentage}
                  className="w-16"
                  aria-label={`阶段 ${group.sort} 完成进度`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto px-5 py-6">
        <div className="flex min-w-max items-stretch">
          {groups.map((group, groupIndex) => {
            const completed = group.nodes.filter((node) => node.taskStatus === "COMPLETED").length;
            const stageCompleted = completed === group.nodes.length;

            return (
              <Fragment key={group.sort}>
                {groupIndex > 0 && (
                  <div className="flex w-12 shrink-0 items-center pt-8" aria-hidden="true">
                    <div className="h-px flex-1 bg-border" />
                    <div
                      className={cn(
                        "size-1.5 rotate-45 border-r border-t",
                        stageCompleted ? "border-primary" : "border-muted-foreground",
                      )}
                    />
                  </div>
                )}
                <section className="flex w-60 shrink-0 flex-col">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      阶段 {group.sort}
                    </span>
                    {group.nodes.length > 1 && (
                      <span className="text-xs text-muted-foreground">
                        并行 {group.nodes.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {group.nodes.map((node) => {
                      const instance = findInstance(node, props.instances);
                      return (
                        <TaskNodeCard
                          key={node.id}
                          node={node}
                          instance={instance}
                          currentUserId={props.currentUserId}
                          mutating={Boolean(instance && instance.id === props.mutatingInstanceId)}
                          onClaim={props.onClaim}
                          onSubmit={props.onSubmit}
                        />
                      );
                    })}
                  </div>
                </section>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
