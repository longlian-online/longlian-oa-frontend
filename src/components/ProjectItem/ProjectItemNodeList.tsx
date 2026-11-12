import type { ReactElement } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatSlotLabel } from "@/lib/slotLabel";
import type { ProjectItemNodeState, ProjectItemNodeVO } from "@/types/projectItem";

const NODE_LABELS: Record<ProjectItemNodeState, string> = {
  COMPLETED: "已完成",
  IN_PROGRESS: "未完成",
  LOCKED: "未解锁",
};

function visibleSlotLabel(node: ProjectItemNodeVO, nodes: ProjectItemNodeVO[]): string {
  const stage = nodes
    .filter((candidate) => candidate.sort === node.sort)
    .sort((prev, next) => prev.parallelSort - next.parallelSort);
  const slotIndex = stage.indexOf(node);
  const sorts = [
    ...new Set(
      nodes.filter((candidate) => candidate.name === node.name).map((candidate) => candidate.sort),
    ),
  ].sort((prev, next) => prev - next);
  return formatSlotLabel({
    name: node.name,
    slotIndex: slotIndex >= 0 ? slotIndex + 1 : 1,
    slotTotal: Math.max(stage.length, 1),
    serialStep: sorts.length > 1 ? sorts.indexOf(node.sort) + 1 : null,
  });
}

export default function ProjectItemNodeList({
  nodes,
}: {
  nodes: ProjectItemNodeVO[];
}): ReactElement {
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">这个项目还没有节点</p>;
  }
  const sorted = [...nodes].sort(
    (prev, next) => prev.sort - next.sort || prev.parallelSort - next.parallelSort,
  );
  // IN_PROGRESS 表示未完成，后续阶段也可能返回它；只有最早未完成阶段是当前阶段。
  const currentSort = sorted.find((node) => node.state === "IN_PROGRESS")?.sort;

  return (
    <ol aria-label="流程节点" className="flex flex-wrap items-center gap-y-2">
      {sorted.map((node, index) => {
        const current = node.state === "IN_PROGRESS" && node.sort === currentSort;
        const stateLabel = current ? "当前阶段" : NODE_LABELS[node.state];
        const next = sorted[index + 1];
        const stageBreak = next != null && next.sort !== node.sort;
        return (
          <li
            key={`${node.sort}-${node.parallelSort}-${node.name}`}
            aria-label={`${node.name}：${stateLabel}`}
            className="flex max-w-full items-center"
          >
            <span
              className={cn(
                "inline-flex max-w-44 items-center gap-1 rounded-md px-1.5 py-1 text-xs",
                current ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {node.state === "COMPLETED" && <Check className="size-3 shrink-0" aria-hidden />}
              <span className="truncate">{visibleSlotLabel(node, sorted)}</span>
            </span>
            {stageBreak && <span aria-hidden className="mx-1.5 h-px w-4 shrink-0 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
