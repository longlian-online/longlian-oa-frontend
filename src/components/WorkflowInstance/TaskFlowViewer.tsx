import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
} from "@xyflow/react";
import { Layers2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";
import TaskNodeCard, { type TaskFlowNode } from "./TaskNodeCard";

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

const NODE_TYPES = { task: TaskNodeCard };
const STAGE_GAP = 310;
const PARALLEL_GAP = 180;

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

function buildGraph(
  groups: NodeGroup[],
  instances: ItemTaskInstanceVO[],
  currentUserId: string | null | undefined,
  mutatingInstanceId: string | null | undefined,
  onClaim: (instanceId: string) => void,
  onSubmit: (instance: ItemTaskInstanceVO, node: ItemTaskNodeVO) => void,
): { flowNodes: TaskFlowNode[]; edges: Edge[] } {
  const flowNodes = groups.flatMap((group, groupIndex) =>
    group.nodes.map((node, parallelIndex) => {
      const instance = findInstance(node, instances);
      return {
        id: String(node.id),
        type: "task",
        draggable: false,
        position: { x: 70 + groupIndex * STAGE_GAP, y: 75 + parallelIndex * PARALLEL_GAP },
        data: {
          node,
          instance,
          currentUserId,
          mutating: Boolean(instance && instance.id === mutatingInstanceId),
          onClaim,
          onSubmit,
        },
      } satisfies TaskFlowNode;
    }),
  );

  const edges = groups.flatMap((group, groupIndex) => {
    const nextGroup = groups[groupIndex + 1];
    if (!nextGroup) return [];
    return group.nodes.flatMap((source) =>
      nextGroup.nodes.map((target) => ({
        id: `${source.id}-${target.id}`,
        source: String(source.id),
        target: String(target.id),
        type: "smoothstep",
        animated: source.taskStatus === "COMPLETED" && target.taskStatus !== "COMPLETED",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.5 },
      })),
    );
  });
  return { flowNodes, edges };
}

export default function TaskFlowViewer(props: TaskFlowViewerProps) {
  const groups = useMemo(() => groupNodes(props.nodes), [props.nodes]);
  const graph = useMemo(
    () =>
      buildGraph(
        groups,
        props.instances,
        props.currentUserId,
        props.mutatingInstanceId,
        props.onClaim,
        props.onSubmit,
      ),
    [groups, props],
  );

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
      <div className="h-[520px]">
        <ReactFlow<TaskFlowNode, Edge>
          nodes={graph.flowNodes}
          edges={graph.edges}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.35}
          maxZoom={1.5}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap position="bottom-right" pannable zoomable nodeColor="var(--primary)" />
        </ReactFlow>
      </div>
    </section>
  );
}
