import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
import WorkflowViewportControls from "@/components/WorkflowViewportControls";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import { buildDragPreviewScene } from "./dragPreview";
import WorkflowNode, { type WorkflowFlowNode } from "./WorkflowNode";
import {
  groupNodes,
  getWorkflowDropTarget,
  applyWorkflowDropTarget,
  WORKFLOW_STAGE_GAP as STAGE_GAP,
  WORKFLOW_PARALLEL_GAP as PARALLEL_GAP,
  WORKFLOW_START_X as START_X,
  WORKFLOW_START_Y as START_Y,
  WORKFLOW_NODE_WIDTH,
  type WorkflowDropTarget,
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
  onRemoveNode: (localId: string) => void;
  onAddNode: (baseTaskId: string, stageIndex?: number) => void;
  assigneeNames?: Record<string, string | undefined>;
}

type CanvasNode = WorkflowFlowNode;
const NODE_TYPES = { workflow: WorkflowNode };

function buildFlowNodes(
  nodes: WorkflowEditorNode[],
  baseTasks: BaseTaskVO[],
  selectedNodeId: string | null,
  onSelectNode: (localId: string) => void,
  onRemoveNode: (localId: string) => void,
  assigneeNames?: Record<string, string | undefined>,
): WorkflowFlowNode[] {
  const groups = groupNodes(nodes);
  const maxParallelCount = groups.reduce((max, group) => Math.max(max, group.length), 0);

  return groups.flatMap((group, stageIndex) =>
    group.map((node, parallelIndex) => {
      const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
      return {
        id: node.localId,
        type: "workflow",
        position: {
          x: START_X + stageIndex * STAGE_GAP,
          y: START_Y + ((maxParallelCount - group.length) / 2 + parallelIndex) * PARALLEL_GAP,
        },
        data: {
          label: getNodeLabel(node, baseTasks),
          taskName: baseTask?.name ?? getNodeLabel(node, baseTasks),
          description: baseTask?.description,
          icon: baseTask?.icon,
          stage: node.sort,
          parallelCount: group.length,
          selected: selectedNodeId === node.localId,
          locked: node.locked,
          showAssignee: assigneeNames !== undefined,
          assigneeLabel: assigneeNames?.[node.localId],
          onSelect: onSelectNode,
          onRemove: onRemoveNode,
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
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.5, strokeDasharray: "6 6" },
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
  onRemoveNode,
  onAddNode,
  assigneeNames,
}: WorkflowCanvasProps) {
  const initialNodes = useMemo(
    () =>
      buildFlowNodes(nodes, baseTasks, selectedNodeId, onSelectNode, onRemoveNode, assigneeNames),
    [assigneeNames, baseTasks, nodes, onRemoveNode, onSelectNode, selectedNodeId],
  );
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<CanvasNode>(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(buildEdges(nodes));
  const [dragging, setDragging] = useState(false);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<CanvasNode, Edge> | null>(
    null,
  );

  const [preview, setPreview] = useState<{ localId: string; target: WorkflowDropTarget } | null>(
    null,
  );
  const previewRef = useRef<typeof preview>(null);
  const previewNodes = useMemo(
    () => (preview ? applyWorkflowDropTarget(nodes, preview.localId, preview.target) : null),
    [nodes, preview],
  );
  const previewScene = useMemo(() => {
    if (!preview || !previewNodes) return { nodes: flowNodes, edges: flowEdges };
    return buildDragPreviewScene(
      flowNodes,
      buildFlowNodes(
        previewNodes,
        baseTasks,
        selectedNodeId,
        onSelectNode,
        onRemoveNode,
        assigneeNames,
      ),
      buildEdges(previewNodes),
      preview.localId,
    );
  }, [
    assigneeNames,
    baseTasks,
    flowEdges,
    flowNodes,
    onRemoveNode,
    onSelectNode,
    preview,
    previewNodes,
    selectedNodeId,
  ]);

  useEffect(() => {
    if (!dragging) setFlowNodes(initialNodes);
  }, [dragging, initialNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(buildEdges(nodes));
  }, [nodes, setFlowEdges]);

  const handleNodeClick: NodeMouseHandler<CanvasNode> = useCallback(
    (_event, node) => onSelectNode(node.id),
    [onSelectNode],
  );

  const getDropTarget = useCallback(
    (node: CanvasNode): WorkflowDropTarget =>
      getWorkflowDropTarget(nodes, node.id, {
        x: node.position.x + (node.measured?.width ?? WORKFLOW_NODE_WIDTH) / 2,
        y: node.position.y + (node.measured?.height ?? 96) / 2,
      }),
    [nodes],
  );

  const handleNodeDrag: OnNodeDrag<CanvasNode> = useCallback(
    (_event, node): void => {
      const target = getDropTarget(node);
      const previous = previewRef.current;
      if (
        previous?.localId === node.id &&
        JSON.stringify(previous.target) === JSON.stringify(target)
      )
        return;
      const next = { localId: node.id, target };
      previewRef.current = next;
      setPreview(next);
    },
    [getDropTarget],
  );

  const handleNodeDragStop: OnNodeDrag<CanvasNode> = useCallback(
    (_event, draggedNode): void => {
      const target = getDropTarget(draggedNode);
      previewRef.current = null;
      setPreview(null);
      setDragging(false);
      if (target.type === "parallel") onMoveToParallelGroup(draggedNode.id, target.targetSort);
      else onMoveToStage(draggedNode.id, target.stageIndex);
    },
    [getDropTarget, onMoveToParallelGroup, onMoveToStage],
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
        <span className="flex shrink-0 items-center gap-2 text-sm font-medium">
          <Layers2 className="size-4 text-muted-foreground" />
          流程阶段
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">
            拖入节点中心并行，拖到左侧或列间插入阶段
          </span>
          <Badge variant="outline">{nodes.length} 个节点</Badge>
        </div>
      </div>
      <ReactFlow<CanvasNode, Edge>
        proOptions={{ hideAttribution: true }}
        nodes={previewScene.nodes}
        edges={previewScene.edges}
        nodeTypes={NODE_TYPES}
        minZoom={0.55}
        maxZoom={1.35}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        panOnDrag
        preventScrolling
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesConnectable={false}
        deleteKeyCode={null}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStart={(event, node) => {
          setDragging(true);
          handleNodeDrag(event, node, [node]);
        }}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={() => onSelectNode(null)}
        onInit={setFlowInstance}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="bg-muted/20 pt-12"
      >
        <WorkflowViewportControls />
      </ReactFlow>
    </section>
  );
}
