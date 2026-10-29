import { normalizeNodes, type WorkflowEditorNode } from "@/components/WorkflowEditor/utils";
import type { BaseTaskVO } from "@/types/workflowTemplate";
import type { ItemTaskFlowUpdateDTO, ItemTaskNodeVO } from "@/types/workflowInstance";

export function buildItemEditorNodes(nodes: ItemTaskNodeVO[]): WorkflowEditorNode[] {
  return normalizeNodes(
    nodes.map((node) => ({
      localId: node.id,
      nodeId: node.id,
      revision: node.revision,
      baseTaskId: node.baseTaskId,
      customName: node.name,
      sort: node.sort,
      parallelSort: node.parallelSort ?? 1,
      locked: node.removable !== true,
    })),
  );
}

export function validateItemEditorNodes(
  nodes: WorkflowEditorNode[],
  baseTasks: BaseTaskVO[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (nodes.length === 0) errors.push("请至少添加一个任务节点");
  nodes.forEach((node) => {
    if (node.nodeId) return;
    const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
    if (!baseTask) errors.push(`节点「${node.customName || node.baseTaskId}」的基础任务不存在`);
    if (baseTask?.status === "DISABLED") errors.push(`基础任务「${baseTask.name}」已停用`);
  });
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

export function toItemWorkflowUpdate(
  original: ItemTaskNodeVO[],
  nodes: WorkflowEditorNode[],
): ItemTaskFlowUpdateDTO {
  const normalized = normalizeNodes(nodes);
  const keptIds = new Set(normalized.flatMap((node) => (node.nodeId ? [node.nodeId] : [])));
  return {
    nodes: normalized.map((node) => ({
      id: node.nodeId,
      revision: node.nodeId ? node.revision : undefined,
      baseTaskId: node.baseTaskId,
      sort: node.sort,
      parallelSort: node.parallelSort,
      name: node.customName.trim() || undefined,
    })),
    removed: original
      .filter((node) => !keptIds.has(node.id))
      .map((node) => ({ id: node.id, revision: node.revision ?? "" })),
  };
}
