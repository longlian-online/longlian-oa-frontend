import { useState } from "react";

import type { BaseTaskVO } from "@/types/workflowTemplate";
import NodePanel from "./NodePanel";
import WorkflowCanvas from "./WorkflowCanvas";
import {
  createEditorNode,
  moveNodeByOffset,
  moveNodeToParallelGroup,
  moveNodeToStage,
  normalizeNodes,
  type WorkflowEditorNode,
} from "./utils";

interface WorkflowEditorProps {
  value: WorkflowEditorNode[];
  baseTasks: BaseTaskVO[];
  selectedBaseTaskId: string;
  loadingBaseTasks: boolean;
  onChange: (nodes: WorkflowEditorNode[]) => void;
  onSelectBaseTask: (baseTaskId: string) => void;
}

export default function WorkflowEditor({
  value,
  baseTasks,
  selectedBaseTaskId,
  loadingBaseTasks,
  onChange,
  onSelectBaseTask,
}: WorkflowEditorProps) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  function updateNodes(nodes: WorkflowEditorNode[]): void {
    onChange(normalizeNodes(nodes));
  }

  function handleAddNode(): void {
    if (!selectedBaseTaskId) return;
    updateNodes([...value, createEditorNode(selectedBaseTaskId, baseTasks, value)]);
  }

  function handleRenameNode(localId: string, customName: string): void {
    updateNodes(value.map((node) => (node.localId === localId ? { ...node, customName } : node)));
  }

  function handleRemoveNode(localId: string): void {
    updateNodes(value.filter((node) => node.localId !== localId));
  }

  function handleMakeParallel(localId: string): void {
    const normalizedNodes = normalizeNodes(value);
    const nodeIndex = normalizedNodes.findIndex((node) => node.localId === localId);
    if (nodeIndex <= 0) return;
    updateNodes(
      moveNodeToParallelGroup(normalizedNodes, localId, normalizedNodes[nodeIndex - 1].sort),
    );
  }

  function handleSplitStage(localId: string): void {
    const normalizedNodes = normalizeNodes(value);
    const nodeIndex = normalizedNodes.findIndex((node) => node.localId === localId);
    if (nodeIndex < 0) return;
    updateNodes(moveNodeToStage(normalizedNodes, localId, nodeIndex + 1));
  }

  function handleMoveToStage(localId: string, stageIndex: number): void {
    updateNodes(moveNodeToStage(value, localId, stageIndex));
    setDraggingNodeId(null);
  }

  function handleMoveToParallelGroup(localId: string, targetSort: number): void {
    updateNodes(moveNodeToParallelGroup(value, localId, targetSort));
    setDraggingNodeId(null);
  }

  return (
    <>
      <WorkflowCanvas
        nodes={value}
        baseTasks={baseTasks}
        onDragStart={setDraggingNodeId}
        onMoveToStage={handleMoveToStage}
        onMoveToParallelGroup={(localId, targetSort) => {
          if (draggingNodeId !== localId) return;
          handleMoveToParallelGroup(localId, targetSort);
        }}
        onRename={handleRenameNode}
        onRemove={handleRemoveNode}
      />
      <NodePanel
        nodes={value}
        baseTasks={baseTasks}
        selectedBaseTaskId={selectedBaseTaskId}
        loadingBaseTasks={loadingBaseTasks}
        onSelectBaseTask={onSelectBaseTask}
        onAddNode={handleAddNode}
        onMakeParallel={handleMakeParallel}
        onSplitStage={handleSplitStage}
        onMoveUp={(localId) => updateNodes(moveNodeByOffset(value, localId, -1))}
        onMoveDown={(localId) => updateNodes(moveNodeByOffset(value, localId, 1))}
      />
    </>
  );
}

export { buildEditorNodes, toCreateNodes, type WorkflowEditorNode } from "./utils";
