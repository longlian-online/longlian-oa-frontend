import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import {
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeMouseHandler,
  type OnNodeDrag,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Layers2, LocateFixed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import WorkflowNode, { type WorkflowFlowNode } from "./WorkflowNode";
import {
  groupNodes,
  getNodeLabel,
  WORKFLOW_TASK_DRAG_TYPE,
  type WorkflowEditorNode,
} from "./utils";

interface WorkflowCanvasProps {
  nodes: WorkflowEditorNode[];
  baseTasks: BaseTaskVO[];
  selectedNodeId: string | null;
  onSelectNode: (localId: string | null) => void;
  onMoveToStage: (localId: string, stageIndex: number) => void;
  onMoveToParallelGroup: (localId: string, targetSort: number) => void;
  onAddNode: (baseTaskId: string, stageIndex?: number) => void;
}

const NODE_TYPES = { workflow: WorkflowNode };
const STAGE_GAP = 316;
const PARALLEL_GAP = 132;
const START_X = 72;
const START_Y = 80;

function buildFlowNodes(
  nodes: WorkflowEditorNode[],
  baseTasks: BaseTaskVO[],
  selectedNodeId: string | null,
  onSelectNode: (localId: string) => void,
): WorkflowFlowNode[] {
  return groupNodes(nodes).flatMap((group, stageIndex) =>
    group.map((node, parallelIndex) => {
      const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
      return {
        id: node.localId,
        type: "workflow",
        position: {
          x: START_X + stageIndex * STAGE_GAP,
          y: START_Y + parallelIndex * PARALLEL_GAP,
        },
        data: {
          label: getNodeLabel(node, baseTasks),
          taskName: baseTask?.name ?? getNodeLabel(node, baseTasks),
          description: baseTask?.description,
          iconUrl: baseTask?.iconUrl,
          stage: node.sort,
          parallelCount: group.length,
          selected: selectedNodeId === node.localId,
          onSelect: onSelectNode,
        },
      } satisfies WorkflowFlowNode;
    }),
  );
}

function buildEdges(nodes: WorkflowEditorNode[]): Edge[] {
  const groups = groupNodes(nodes);
  return groups.flatMap((group, groupIndex) => {
    const nextGroup = groups[groupIndex + 1];
    if (!nextGroup) return [];
    return group.flatMap((source) =>
      nextGroup.map((target) => ({
        id: `${source.localId}-${target.localId}`,
        source: source.localId,
        target: target.localId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.5 },
      })),
    );
  });
}

export default function WorkflowCanvas({
  nodes,
  baseTasks,
  selectedNodeId,
  onSelectNode,
  onMoveToStage,
  onMoveToParallelGroup,
  onAddNode,
}: WorkflowCanvasProps) {
  const initialNodes = useMemo(
    () => buildFlowNodes(nodes, baseTasks, selectedNodeId, onSelectNode),
    [baseTasks, nodes, onSelectNode, selectedNodeId],
  );
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(buildEdges(nodes));
  const [dragging, setDragging] = useState(false);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<
    WorkflowFlowNode,
    Edge
  > | null>(null);

  useEffect(() => {
    if (!dragging) setFlowNodes(initialNodes);
  }, [dragging, initialNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(buildEdges(nodes));
  }, [nodes, setFlowEdges]);

  const handleNodeClick: NodeMouseHandler<WorkflowFlowNode> = useCallback(
    (_event, node) => onSelectNode(node.id),
    [onSelectNode],
  );

  const handleNodeDragStop: OnNodeDrag<WorkflowFlowNode> = useCallback(
    (_event, draggedNode) => {
      setDragging(false);
      const groups = groupNodes(nodes);
      const candidates = groups
        .map((group, index) => ({
          group,
          index,
          distance: Math.abs(draggedNode.position.x - (START_X + index * STAGE_GAP)),
        }))
        .filter(({ group }) => !group.some((node) => node.localId === draggedNode.id));
      const nearest = candidates.sort((prev, next) => prev.distance - next.distance)[0];

      if (nearest && nearest.distance < STAGE_GAP * 0.34) {
        onMoveToParallelGroup(draggedNode.id, nearest.group[0].sort);
        return;
      }

      const targetStageIndex = Math.max(
        0,
        Math.min(groups.length, Math.round((draggedNode.position.x - START_X) / STAGE_GAP)),
      );
      onMoveToStage(draggedNode.id, targetStageIndex);
    },
    [nodes, onMoveToParallelGroup, onMoveToStage],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>): void => {
    if (!event.dataTransfer.types.includes(WORKFLOW_TASK_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      const baseTaskId = event.dataTransfer.getData(WORKFLOW_TASK_DRAG_TYPE);
      if (!baseTaskId) return;

      event.preventDefault();
      const flowPosition = flowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const stageIndex = flowPosition
        ? Math.max(
            0,
            Math.min(groupNodes(nodes).length, Math.round((flowPosition.x - START_X) / STAGE_GAP)),
          )
        : undefined;
      onAddNode(baseTaskId, stageIndex);
    },
    [flowInstance, nodes, onAddNode],
  );

  if (nodes.length === 0) {
    return (
      <section className="flex h-[520px] flex-col overflow-hidden rounded-xl border bg-card">
        <div className="flex h-12 items-center justify-between border-b px-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Layers2 className="size-4 text-muted-foreground" />
            流程阶段
          </span>
          <Badge variant="outline">0 个节点</Badge>
        </div>
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 text-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LocateFixed className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">从上方任务库拖入第一个节点</p>
            <p className="mt-1 text-xs text-muted-foreground">也可以点击节点卡追加到流程末尾</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[520px] overflow-hidden rounded-xl border bg-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between border-b bg-card px-4">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Layers2 className="size-4 text-muted-foreground" />
          流程阶段
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">拖到同列并行，拖到列间排序</span>
          <Badge variant="outline">{nodes.length} 个节点</Badge>
        </div>
      </div>
      <ReactFlow<WorkflowFlowNode, Edge>
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        minZoom={0.55}
        maxZoom={1.35}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesConnectable={false}
        deleteKeyCode={null}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStart={() => setDragging(true)}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={() => onSelectNode(null)}
        onInit={setFlowInstance}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="bg-muted/20 pt-12"
      />
    </section>
  );
}
