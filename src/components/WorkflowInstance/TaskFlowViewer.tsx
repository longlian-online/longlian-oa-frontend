import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  applyNodeChanges,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodesChange,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { Check, Layers2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatSlotLabel, slotPosition } from "@/lib/slotLabel";
import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";
import TaskNodeCard from "./TaskNodeCard";

interface TaskFlowViewerProps {
  nodes: ItemTaskNodeVO[];
  instances: ItemTaskInstanceVO[];
  currentUserId?: string | null;
  mutatingInstanceId?: string | null;
  selectedNodeId?: string | null;
  blockingNodeId?: string;
  onSelectNode: (nodeId: string) => void;
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
  blockingStageSort?: number;
}

function StageTimeline({ groups, currentStageSort, blockingStageSort }: StageTimelineProps) {
  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-start px-1">
        {groups.map((group, index) => {
          const completed = group.nodes.filter((node) => node.taskStatus === "COMPLETED").length;
          const stageName = Array.from(new Set(group.nodes.map((node) => node.name))).join(" / ");
          const isCompleted = completed === group.nodes.length;
          const isCurrent = group.sort === currentStageSort;
          const isBlocking = group.sort === blockingStageSort;
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
                {isBlocking && (
                  <span className="block font-medium text-amber-700 dark:text-amber-400">
                    阻塞阶段
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type TaskFlowNode = Node<
  {
    node: ItemTaskNodeVO;
    label: string;
    blocking: boolean;
    instance?: ItemTaskInstanceVO;
    currentUserId?: string | null;
    selected: boolean;
    onSelect: () => void;
    mutating: boolean;
    canSubmit: boolean;
    onClaim: TaskFlowViewerProps["onClaim"];
    onSubmit: TaskFlowViewerProps["onSubmit"];
  },
  "task"
>;

function TaskCanvasNode({ data }: NodeProps<TaskFlowNode>) {
  return (
    <div className="nodrag nopan pointer-events-auto">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-1.5 !border-0 !bg-border"
      />
      <TaskNodeCard {...data} />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-1.5 !border-0 !bg-border"
      />
    </div>
  );
}

const NODE_TYPES = { task: TaskCanvasNode };
const STAGE_GAP = 316;
const NODE_GAP = 12;
const INITIAL_NODE_HEIGHT = 196;

function centerStages(nodes: TaskFlowNode[]): TaskFlowNode[] {
  const stages = new Map<number, TaskFlowNode[]>();
  nodes.forEach((node) => {
    const stage = stages.get(node.data.node.sort) ?? [];
    stage.push(node);
    stages.set(node.data.node.sort, stage);
  });
  const heights = Array.from(
    stages.values(),
    (stage) =>
      stage.reduce((height, node) => height + (node.measured?.height ?? INITIAL_NODE_HEIGHT), 0) +
      (stage.length - 1) * NODE_GAP,
  );
  const maxHeight = Math.max(0, ...heights);
  return Array.from(stages.values()).flatMap((stage, stageIndex) => {
    let y = (maxHeight - heights[stageIndex]) / 2;
    return stage.map((node) => {
      const position = { x: stageIndex * STAGE_GAP, y };
      y += (node.measured?.height ?? INITIAL_NODE_HEIGHT) + NODE_GAP;
      return node.position.x === position.x && node.position.y === position.y
        ? node
        : { ...node, position };
    });
  });
}

function FitInitialLayout({
  selectedNodeId,
  blockingNodeId,
}: {
  selectedNodeId?: string | null;
  blockingNodeId?: string;
}) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (!initialized) return;
    const target = `${selectedNodeId ?? "all"}:${blockingNodeId ?? ""}`;
    if (fitted.current === target) return;
    const frame = requestAnimationFrame(() => {
      fitted.current = target;
      const nodes = selectedNodeId
        ? [{ id: selectedNodeId }, ...(blockingNodeId ? [{ id: blockingNodeId }] : [])]
        : undefined;
      void fitView({ nodes, padding: 0.25, maxZoom: 1 });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialized, fitView, selectedNodeId, blockingNodeId]);
  return null;
}

export default function TaskFlowViewer(props: TaskFlowViewerProps) {
  const groups = useMemo(() => groupNodes(props.nodes), [props.nodes]);
  const currentStageSort = groups.find((group) =>
    group.nodes.some((node) => node.taskStatus !== "COMPLETED"),
  )?.sort;
  const initialNodes = useMemo(
    () =>
      centerStages(
        groups.flatMap((group) =>
          group.nodes.map((node) => {
            const instance = findInstance(node, props.instances);
            const label = formatSlotLabel(slotPosition(node, props.nodes));
            return {
              id: node.id,
              type: "task" as const,
              position: { x: 0, y: 0 },
              ariaLabel: `${label}，阶段 ${node.sort}`,
              data: {
                node,
                label,
                blocking: node.id === props.blockingNodeId,
                instance,
                currentUserId: props.currentUserId,
                selected: node.id === props.selectedNodeId,
                onSelect: () => props.onSelectNode(node.id),
                mutating: Boolean(instance && instance.id === props.mutatingInstanceId),
                canSubmit: props.nodes
                  .filter((candidate) => candidate.sort < node.sort)
                  .every((candidate) => candidate.taskStatus === "COMPLETED"),
                onClaim: props.onClaim,
                onSubmit: props.onSubmit,
              },
            };
          }),
        ),
      ),
    [
      groups,
      props.instances,
      props.currentUserId,
      props.selectedNodeId,
      props.blockingNodeId,
      props.mutatingInstanceId,
      props.nodes,
      props.onSelectNode,
      props.onClaim,
      props.onSubmit,
    ],
  );
  const [flowNodes, setFlowNodes] = useNodesState<TaskFlowNode>(initialNodes);
  useEffect(() => {
    setFlowNodes((previous) => {
      const measurements = new Map(previous.map((node) => [node.id, node.measured]));
      return centerStages(
        initialNodes.map((node) => ({ ...node, measured: measurements.get(node.id) })),
      );
    });
  }, [initialNodes, setFlowNodes]);
  const onNodesChange: OnNodesChange<TaskFlowNode> = useCallback(
    (changes) => setFlowNodes((nodes) => centerStages(applyNodeChanges(changes, nodes))),
    [setFlowNodes],
  );
  const edges = useMemo<Edge[]>(
    () =>
      groups.flatMap((group, index) => {
        const nextGroup = groups[index + 1];
        if (!nextGroup) return [];
        const completed = nextGroup.nodes.every((node) => node.taskStatus === "COMPLETED");
        return group.nodes.flatMap((source) =>
          nextGroup.nodes.map((target) => ({
            id: `${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: completed ? "var(--primary)" : "var(--muted-foreground)",
            },
            style: { stroke: completed ? "var(--primary)" : "var(--border)" },
          })),
        );
      }),
    [groups],
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
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers2 className="size-4 text-muted-foreground" />
          流程进度
        </div>
        <StageTimeline
          groups={groups}
          currentStageSort={currentStageSort}
          blockingStageSort={props.nodes.find((node) => node.id === props.blockingNodeId)?.sort}
        />
      </div>
      <div className="h-[520px] bg-muted/20">
        <ReactFlow<TaskFlowNode, Edge>
          nodes={flowNodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
          minZoom={0.1}
          maxZoom={1.5}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <FitInitialLayout
            selectedNodeId={props.selectedNodeId}
            blockingNodeId={props.blockingNodeId}
          />
          <Controls
            showInteractive={false}
            className="overflow-hidden rounded-lg border border-border [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground [&>button>svg]:!fill-current"
          />
        </ReactFlow>
      </div>
    </section>
  );
}
