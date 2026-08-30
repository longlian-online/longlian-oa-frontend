import { useCallback, useEffect, useMemo, useState } from "react";

import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import NodeInspector from "./NodeInspector";
import NodePanel from "./NodePanel";
import WorkflowCanvas from "./WorkflowCanvas";
import {
  createEditorNode,
  getNodeLabel,
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

interface NodeInspectorOverlayProps {
  node?: WorkflowEditorNode;
  baseTasks: BaseTaskVO[];
  onRename: (localId: string, customName: string) => void;
  onRemove: (localId: string) => void;
  onMakeParallel: (localId: string) => void;
  onSplitStage: (localId: string) => void;
  onMoveUp: (localId: string) => void;
  onMoveDown: (localId: string) => void;
}

function NodeInspectorOverlay({
  node,
  baseTasks,
  onRename,
  onRemove,
  onMakeParallel,
  onSplitStage,
  onMoveUp,
  onMoveDown,
}: NodeInspectorOverlayProps) {
  const [renderedNode, setRenderedNode] = useState<WorkflowEditorNode | undefined>(node);
  const [visible, setVisible] = useState(Boolean(node));

  useEffect(() => {
    if (node) {
      setRenderedNode(node);
      setVisible(true);
      return;
    }

    setVisible(false);
    const timeoutId = window.setTimeout(() => setRenderedNode(undefined), 200);
    return () => window.clearTimeout(timeoutId);
  }, [node]);

  if (!renderedNode) return null;

  return (
    <div
      className={cn(
        "absolute inset-y-0 right-0 z-20 w-full transition-[opacity,transform] duration-200 ease-out sm:w-72",
        visible ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0",
      )}
    >
      <NodeInspector
        node={renderedNode}
        baseTasks={baseTasks}
        onRename={onRename}
        onRemove={onRemove}
        onMakeParallel={onMakeParallel}
        onSplitStage={onSplitStage}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}

export default function WorkflowEditor({
  value,
  baseTasks,
  loadingBaseTasks,
  onChange,
}: WorkflowEditorProps) {
  const confirm = useConfirm();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = useMemo(
    () => value.find((node) => node.localId === selectedNodeId),
    [selectedNodeId, value],
  );

  const updateNodes = useCallback(
    (nodes: WorkflowEditorNode[]): void => onChange(normalizeNodes(nodes)),
    [onChange],
  );

  function handleAddNode(baseTaskId: string, stageIndex?: number): void {
    const nextNode = createEditorNode(baseTaskId, baseTasks, value);
    const nextNodes = [...value, nextNode];
    updateNodes(
      stageIndex === undefined
        ? nextNodes
        : moveNodeToStage(nextNodes, nextNode.localId, stageIndex),
    );
    setSelectedNodeId(nextNode.localId);
  }

  function handleRenameNode(localId: string, customName: string): void {
    updateNodes(value.map((node) => (node.localId === localId ? { ...node, customName } : node)));
  }

  async function handleRemoveNode(localId: string): Promise<void> {
    const node = value.find((item) => item.localId === localId);
    const confirmed = await confirm({
      title: "删除节点？",
      description: `「${node ? getNodeLabel(node, baseTasks) : "该"}」将从当前流程中移除。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!confirmed) return;

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
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-3">
      <NodePanel
        baseTasks={baseTasks}
        loadingBaseTasks={loadingBaseTasks}
        onAddNode={handleAddNode}
      />
      <div className="relative min-w-0">
        <WorkflowCanvas
          nodes={value}
          baseTasks={baseTasks}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onMoveToStage={handleMoveToStage}
          onMoveToParallelGroup={handleMoveToParallelGroup}
          onAddNode={handleAddNode}
        />
        <NodeInspectorOverlay
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
    </div>
  );
}

export {
  buildEditorNodes,
  toCreateNodes,
  validateEditorNodes,
  type WorkflowEditorNode,
} from "./utils";
