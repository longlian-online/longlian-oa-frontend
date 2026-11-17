import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
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
import { Check, CheckCircle2, Circle, Clock, GitBranch, Layers2, Lock } from "lucide-react";

import WorkflowViewportControls from "@/components/WorkflowViewportControls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  onSelectNode: (nodeId: string) => void;
  onClaim: (instanceId: string) => void;
  onSubmit: (instance: ItemTaskInstanceVO, node: ItemTaskNodeVO) => void;
  onSaveDraft: (instance: ItemTaskInstanceVO, node: ItemTaskNodeVO) => void;
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
              className="relative flex w-auto min-w-28 shrink-0 flex-col items-center text-center"
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
                  "mt-2 line-clamp-2 max-w-full px-2 text-xs font-medium",
                  isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground",
                )}
                title={stageName}
              >
                {stageName}
              </span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {completed}/{group.nodes.length}
                {group.nodes.length > 1 ? " · 并行" : ""}
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
    instance?: ItemTaskInstanceVO;
    currentUserId?: string | null;
    selected: boolean;
    onSelect: () => void;
    mutating: boolean;
    canSubmit: boolean;
    onClaim: TaskFlowViewerProps["onClaim"];
    onSubmit: TaskFlowViewerProps["onSubmit"];
    onSaveDraft: TaskFlowViewerProps["onSaveDraft"];
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

function FitInitialLayout() {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const fitted = useRef(false);
  useEffect(() => {
    if (!initialized || fitted.current) return;
    const frame = requestAnimationFrame(() => {
      fitted.current = true;
      void fitView({ padding: 0.18, maxZoom: 1 });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialized, fitView]);
  return null;
}

export default function TaskFlowViewer(props: TaskFlowViewerProps) {
  const [canvasOpen, setCanvasOpen] = useState(false);
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
                onSaveDraft: props.onSaveDraft,
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
      props.mutatingInstanceId,
      props.nodes,
      props.onSelectNode,
      props.onClaim,
      props.onSubmit,
      props.onSaveDraft,
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
              color: completed ? "var(--foreground)" : "var(--muted-foreground)",
            },
            style: { stroke: completed ? "var(--foreground)" : "var(--border)" },
          })),
        );
      }),
    [groups],
  );

  if (groups.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/20 px-6 text-center">
        <p className="text-sm font-medium text-foreground">还没有任务节点</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          阶段和槽位会按流程排在这里。当前还没有可推进的节点。
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-label="项目任务">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-sm font-semibold">项目任务</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {props.nodes.filter((node) => node.taskStatus === "COMPLETED").length}/
          {props.nodes.length}
        </span>
      </div>
      <ol className="max-h-[65vh] space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <li key={group.sort}>
            <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">阶段 {group.sort}</p>
            <div className="space-y-1">
              {group.nodes.map((node) => {
                const instance = findInstance(node, props.instances);
                const selected = props.selectedNodeId === node.id;
                const status =
                  node.taskStatus === undefined ? (instance?.status ?? null) : node.taskStatus;
                const StatusIcon =
                  status === "COMPLETED"
                    ? CheckCircle2
                    : status === "CLAIMED"
                      ? Clock
                      : status === "PENDING"
                        ? Circle
                        : Lock;
                const label = formatSlotLabel(slotPosition(node, props.nodes));
                return (
                  <button
                    key={node.id}
                    type="button"
                    aria-label={`查看${label}任务详情`}
                    aria-pressed={selected}
                    onClick={() => props.onSelectNode(node.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                      selected && "border-border bg-secondary",
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        status === "COMPLETED"
                          ? "text-[hsl(var(--shoka-success))]"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium">{label}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {instance?.assigneeNickname ||
                          (status === "PENDING" ? "待接取" : status ? "暂无执行人" : "未解锁")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <div className="border-t p-3">
        <Button
          variant="outline"
          className="h-9 w-full text-sm"
          onClick={() => setCanvasOpen(true)}
        >
          <GitBranch className="size-4" />
          查看完整流程
        </Button>
      </div>
      <Dialog open={canvasOpen} onOpenChange={setCanvasOpen}>
        <DialogContent className="w-[92vw] max-w-none gap-0 overflow-hidden p-0 sm:max-w-[92vw]">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Layers2 className="size-5" />
              完整流程
            </DialogTitle>
            <StageTimeline groups={groups} currentStageSort={currentStageSort} />
          </DialogHeader>
          <div className="h-[65vh] bg-muted/20">
            {canvasOpen && (
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
                minZoom={0.25}
                maxZoom={1.5}
                panOnScroll
                zoomOnScroll={false}
                zoomOnPinch
                panOnDrag
                preventScrolling
                fitView
                fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
                proOptions={{ hideAttribution: true }}
              >
                <FitInitialLayout />
                <WorkflowViewportControls />
              </ReactFlow>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
