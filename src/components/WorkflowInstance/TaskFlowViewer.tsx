import { Fragment, useMemo } from "react";
import { Check, Layers2 } from "lucide-react";

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

interface StageTimelineProps {
  groups: NodeGroup[];
  currentStageSort?: number;
}

function StageTimeline({ groups, currentStageSort }: StageTimelineProps) {
  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-start px-1">
        {groups.map((group, index) => {
          const completed = group.nodes.filter((node) => node.taskStatus === "COMPLETED").length;
          const stageName = Array.from(new Set(group.nodes.map((node) => node.name))).join(" / ");
          const isCompleted = completed === group.nodes.length;
          const isCurrent = group.sort === currentStageSort;
          const previousGroup = groups[index - 1];
          const previousCompleted = previousGroup
            ? previousGroup.nodes.every((node) => node.taskStatus === "COMPLETED")
            : false;

          return (
            <li
              key={group.sort}
              className="relative flex w-28 shrink-0 flex-col items-center text-center"
            >
              {index > 0 && (
                <span
                  className={cn(
                    "absolute right-1/2 top-3 h-px w-full",
                    previousCompleted ? "bg-foreground" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  isCompleted
                    ? "bg-foreground text-background"
                    : isCurrent
                      ? "border-2 border-foreground bg-background text-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : group.sort}
              </span>
              <span
                className={cn(
                  "mt-2 line-clamp-1 max-w-full px-2 text-xs font-medium",
                  isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground",
                )}
                title={stageName}
              >
                {stageName}
              </span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {completed}/{group.nodes.length} 完成
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function TaskFlowViewer(props: TaskFlowViewerProps) {
  const groups = useMemo(() => groupNodes(props.nodes), [props.nodes]);
  const currentStageSort = groups.find((group) =>
    group.nodes.some((node) => node.taskStatus !== "COMPLETED"),
  )?.sort;

  if (groups.length === 0) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">
        暂无任务节点
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers2 className="size-4 text-muted-foreground" />
          流程进度
        </div>
        <StageTimeline groups={groups} currentStageSort={currentStageSort} />
      </div>
      <div className="overflow-x-scroll px-5 py-6 pb-8 [scrollbar-gutter:stable]">
        <div className="flex min-w-max items-stretch">
          {groups.map((group, groupIndex) => {
            const completed = group.nodes.filter((node) => node.taskStatus === "COMPLETED").length;
            const stageCompleted = completed === group.nodes.length;

            return (
              <Fragment key={group.sort}>
                {groupIndex > 0 && (
                  <div className="flex w-12 shrink-0 items-center" aria-hidden="true">
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
                          canSubmit={props.nodes
                            .filter((candidate) => candidate.sort < node.sort)
                            .every((candidate) => candidate.taskStatus === "COMPLETED")}
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
