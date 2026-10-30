import { normalizeNodes, type WorkflowEditorNode } from "@/components/WorkflowEditor/utils";
import type { ProjectItemNodeCreateDTO, TaskTemplateOptionNodeVO } from "@/types/projectItem";
import type { BaseTaskVO } from "@/types/workflowTemplate";

export function buildCreateItemNodes(
  templateNodes: TaskTemplateOptionNodeVO[],
  baseTasks: BaseTaskVO[],
): WorkflowEditorNode[] {
  return normalizeNodes(
    templateNodes.map((node, index) => {
      const baseTask = baseTasks.find((task) => String(task.id) === String(node.baseTaskId));
      const disabled = node.baseTaskStatus === "DISABLED" || baseTask?.status === "DISABLED";
      return {
        localId: `tpl-${node.baseTaskId}-${node.sort}-${node.parallelSort ?? 1}-${index}`,
        baseTaskId: String(node.baseTaskId),
        customName: baseTask?.name || node.baseTaskName || "",
        sort: node.sort,
        parallelSort: node.parallelSort ?? 1,
        allowDisabled: disabled,
      };
    }),
  );
}

export function validateCreateItemNodes(
  nodes: WorkflowEditorNode[],
  baseTasks: BaseTaskVO[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (nodes.length === 0) errors.push("请至少添加一个任务节点");
  nodes.forEach((node) => {
    if (node.allowDisabled) return;
    const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
    if (!baseTask) errors.push(`节点「${node.customName || node.baseTaskId}」的基础任务不存在`);
    else if (baseTask.status === "DISABLED") errors.push(`基础任务「${baseTask.name}」已停用`);
  });
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

export function toCreateItemNodes(
  nodes: WorkflowEditorNode[],
  assignees: Record<string, string>,
): ProjectItemNodeCreateDTO[] {
  return normalizeNodes(nodes).map((node) => ({
    baseTaskId: node.baseTaskId,
    sort: node.sort,
    parallelSort: node.parallelSort,
    name: node.customName.trim() || undefined,
    assigneeId: assignees[node.localId] || undefined,
  }));
}

export function createItemDraftSignature(
  nodes: WorkflowEditorNode[],
  assignees: Record<string, string>,
): string {
  return JSON.stringify(
    normalizeNodes(nodes).map((node) => [
      node.baseTaskId,
      node.customName,
      node.sort,
      node.parallelSort,
      assignees[node.localId] ?? "",
    ]),
  );
}
