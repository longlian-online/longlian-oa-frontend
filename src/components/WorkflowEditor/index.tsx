import { useCallback, useMemo, useState } from "react";

import type { BaseTaskVO } from "@/types/workflowTemplate";
import NodeInspector from "./NodeInspector";
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
  loadingBaseTasks: boolean;
  onChange: (nodes: WorkflowEditorNode[]) => void;
}

export default function WorkflowEditor({
  value,
  baseTasks,
  loadingBaseTasks,
  onChange,
}: WorkflowEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(value[0]?.localId ?? null);
  const selectedNode = useMemo(
    () => value.find((node) => node.localId === selectedNodeId),
    [selectedNodeId, value],
  );

  const updateNodes = useCallback(
    (nodes: WorkflowEditorNode[]): void => onChange(normalizeNodes(nodes)),
    [onChange],
  );

  function handleAddNode(baseTaskId: string): void {
    const nextNode = createEditorNode(baseTaskId, baseTasks, value);
    updateNodes([...value, nextNode]);
    setSelectedNodeId(nextNode.localId);
  }

  function handleRenameNode(localId: string, customName: string): void {
    updateNodes(value.map((node) => (node.localId === localId ? { ...node, customName } : node)));
  }

  function handleRemoveNode(localId: string): void {
    const nextNodes = value.filter((node) => node.localId !== localId);
    updateNodes(nextNodes);
    if (selectedNodeId === localId) setSelectedNodeId(nextNodes[0]?.localId ?? null);
  }

  function handleMakeParallel(localId: string): void {
    const normalizedNodes = normalizeNodes(value);
    const node = normalizedNodes.find((item) => item.localId === localId);
    if (!node || node.sort <= 1) return;
    updateNodes(moveNodeToParallelGroup(normalizedNodes, localId, node.sort - 1));
  }

  function handleSplitStage(localId: string): void {
    const normalizedNodes = normalizeNodes(value);
    const node = normalizedNodes.find((item) => item.localId === localId);
    if (!node) return;
    updateNodes(moveNodeToStage(normalizedNodes, localId, node.sort));
  }

  const handleMoveToStage = useCallback(
    (localId: string, stageIndex: number): void =>
      updateNodes(moveNodeToStage(value, localId, stageIndex)),
    [updateNodes, value],
  );

  const handleMoveToParallelGroup = useCallback(
    (localId: string, targetSort: number): void =>
      updateNodes(moveNodeToParallelGroup(value, localId, targetSort)),
    [updateNodes, value],
  );

  return (
    <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto">
      <NodePanel
        baseTasks={baseTasks}
        loadingBaseTasks={loadingBaseTasks}
        onAddNode={handleAddNode}
      />
      <WorkflowCanvas
        nodes={value}
        baseTasks={baseTasks}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onMoveToStage={handleMoveToStage}
        onMoveToParallelGroup={handleMoveToParallelGroup}
      />
      <NodeInspector
        node={selectedNode}
        baseTasks={baseTasks}
        onRename={handleRenameNode}
        onRemove={handleRemoveNode}
        onMakeParallel={handleMakeParallel}
        onSplitStage={handleSplitStage}
        onMoveUp={(localId) => updateNodes(moveNodeByOffset(value, localId, -1))}
        onMoveDown={(localId) => updateNodes(moveNodeByOffset(value, localId, 1))}
      />
    </div>
  );
}

export {
  buildEditorNodes,
  toCreateNodes,
  validateEditorNodes,
  type WorkflowEditorNode,
} from "./utils";
