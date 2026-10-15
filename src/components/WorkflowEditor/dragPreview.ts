import { Position, type Edge } from "@xyflow/react";
import type { WorkflowFlowNode } from "./WorkflowNode";

interface DragPreviewScene {
  nodes: WorkflowFlowNode[];
  edges: Edge[];
}

export function buildDragPreviewScene(
  currentNodes: WorkflowFlowNode[],
  plannedNodes: WorkflowFlowNode[],
  plannedEdges: Edge[],
  draggedId: string,
): DragPreviewScene {
  const dragged = currentNodes.find((node) => node.id === draggedId);
  const width = dragged?.measured?.width ?? dragged?.width ?? 224;
  const height = dragged?.measured?.height ?? dragged?.height ?? 96;
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const previewId = `workflow-preview-${draggedId}`;
  return {
    nodes: [
      ...plannedNodes.map(
        (node): WorkflowFlowNode =>
          node.id === draggedId
            ? {
                ...node,
                id: previewId,
                width,
                height,
                measured: { width, height },
                handles: [
                  {
                    type: "target",
                    position: Position.Left,
                    x: -3,
                    y: height / 2 - 3,
                    width: 6,
                    height: 6,
                  },
                  {
                    type: "source",
                    position: Position.Right,
                    x: width - 3,
                    y: height / 2 - 3,
                    width: 6,
                    height: 6,
                  },
                ],
                draggable: false,
                selectable: false,
                focusable: false,
                className: "pointer-events-none",
                zIndex: 999,
                data: { ...node.data, preview: true, selected: false },
              }
            : {
                ...currentById.get(node.id),
                ...node,
                measured: currentById.get(node.id)?.measured,
                draggable: false,
              },
      ),
      ...(dragged ? [{ ...dragged, className: "opacity-60", zIndex: 1000 }] : []),
    ],
    edges: plannedEdges.map((edge) => ({
      ...edge,
      source: edge.source === draggedId ? previewId : edge.source,
      target: edge.target === draggedId ? previewId : edge.target,
    })),
  };
}
