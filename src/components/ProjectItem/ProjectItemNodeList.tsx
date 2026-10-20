import type { ReactElement } from "react";

import { cn } from "@/lib/utils";
import type { ProjectItemNodeState, ProjectItemNodeVO } from "@/types/projectItem";

const NODE_LABELS: Record<ProjectItemNodeState, string> = {
  COMPLETED: "已完成",
  IN_PROGRESS: "未完成",
  LOCKED: "未解锁",
};

export default function ProjectItemNodeList({
  nodes,
}: {
  nodes: ProjectItemNodeVO[];
}): ReactElement {
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无节点信息</p>;
  }
  const sorted = [...nodes].sort(
    (prev, next) => prev.sort - next.sort || prev.parallelSort - next.parallelSort,
  );
  // IN_PROGRESS 表示未完成，后续阶段也可能返回它；只有最早未完成阶段是当前阶段。
  const currentSort = sorted.find((node) => node.state === "IN_PROGRESS")?.sort;

  return (
    <ol aria-label="流程节点" className="flex flex-wrap items-center gap-2">
      {sorted.map((node, index) => {
        const current = node.state === "IN_PROGRESS" && node.sort === currentSort;
        const stateLabel = current ? "当前阶段" : NODE_LABELS[node.state];
        return (
          <li
            key={`${node.sort}-${node.parallelSort}-${node.name}`}
            aria-label={`${node.name}：${stateLabel}`}
            className={cn(
              "flex max-w-full items-center gap-1 rounded-md px-1.5 py-1 text-xs",
              current ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="max-w-24 truncate">{node.name}</span>
            {node.parallelCount > 1 && (
              <span className="text-[10px] text-muted-foreground">+{node.parallelCount - 1}</span>
            )}
            {index < sorted.length - 1 && (
              <span aria-hidden className="ml-1 text-border">
                /
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
