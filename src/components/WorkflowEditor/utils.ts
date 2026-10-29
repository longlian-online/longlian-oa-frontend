import type {
  BaseTaskVO,
  WorkshopTaskTemplateNodeCreateDTO,
  WorkshopTaskTemplateNodeVO,
} from "@/types/workflowTemplate";

export const WORKFLOW_TASK_DRAG_TYPE = "application/x-longlian-workflow-task";

export interface WorkflowEditorValue {
  nodes: WorkshopTaskTemplateNodeCreateDTO[];
}

export interface WorkflowEditorNode {
  localId: string;
  baseTaskId: string;
  customName: string;
  sort: number;
  parallelSort: number;
  nodeId?: string;
  revision?: string;
  locked?: boolean;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

export function getNodeLabel(node: WorkflowEditorNode, baseTasks: BaseTaskVO[]): string {
  const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
  return node.customName || baseTask?.name || "未命名任务";
}

export function buildEditorNodes(nodes?: WorkshopTaskTemplateNodeVO[]): WorkflowEditorNode[] {
  if (!nodes) return [];

  return normalizeNodes(
    nodes.map((node, index) => ({
      localId: `${node.baseTaskId}-${node.sort}-${node.parallelSort ?? 1}-${index}`,
      baseTaskId: String(node.baseTaskId),
      customName: node.customName || node.baseTaskName || "",
      sort: node.sort,
      parallelSort: node.parallelSort ?? 1,
    })),
  );
}

export function normalizeNodes(nodes: WorkflowEditorNode[]): WorkflowEditorNode[] {
  const sortValues = Array.from(new Set(nodes.map((node) => node.sort))).sort(
    (prev, next) => prev - next,
  );
  const sortMap = new Map<number, number>();
  sortValues.forEach((sortValue, index) => {
    sortMap.set(sortValue, index + 1);
  });

  const sortedNodes = [...nodes]
    .sort((prev, next) => {
      if (prev.sort !== next.sort) return prev.sort - next.sort;
      return prev.parallelSort - next.parallelSort;
    })
    .map((node) => ({
      ...node,
      sort: sortMap.get(node.sort) ?? 1,
    }));

  return sortedNodes.map((node) => {
    const sameSortNodes = sortedNodes.filter((item) => item.sort === node.sort);
    const parallelIndex = sameSortNodes.findIndex((item) => item.localId === node.localId);
    return {
      ...node,
      parallelSort: parallelIndex + 1,
    };
  });
}

export function toCreateNodes(nodes: WorkflowEditorNode[]): WorkshopTaskTemplateNodeCreateDTO[] {
  return normalizeNodes(nodes).map((node) => ({
    baseTaskId: node.baseTaskId,
    customName: node.customName.trim() || undefined,
    sort: node.sort,
    parallelSort: node.parallelSort,
  }));
}

export function validateEditorNodes(
  nodes: WorkflowEditorNode[],
  baseTasks: BaseTaskVO[],
): WorkflowValidationResult {
  const errors: string[] = [];
  if (nodes.length === 0) errors.push("请至少添加一个任务节点");

  const localIds = new Set<string>();
  nodes.forEach((node) => {
    if (localIds.has(node.localId)) errors.push("存在重复节点，请删除后重新添加");
    localIds.add(node.localId);

    const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
    if (!baseTask) errors.push(`节点「${node.customName || node.baseTaskId}」的基础任务不存在`);
    if (baseTask?.status === "DISABLED") errors.push(`基础任务「${baseTask.name}」已停用`);
  });

  const normalizedNodes = normalizeNodes(nodes);
  normalizedNodes.forEach((node, index) => {
    if (node.sort < 1 || node.parallelSort < 1) {
      errors.push(`第 ${index + 1} 个节点的流程位置无效`);
    }
  });

  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

export function groupNodes(nodes: WorkflowEditorNode[]): WorkflowEditorNode[][] {
  const grouped = new Map<number, WorkflowEditorNode[]>();
  normalizeNodes(nodes).forEach((node) => {
    const group = grouped.get(node.sort) ?? [];
    group.push(node);
    grouped.set(node.sort, group);
  });

  return Array.from(grouped.entries())
    .sort(([prevSort], [nextSort]) => prevSort - nextSort)
    .map(([, group]) => group.sort((prev, next) => prev.parallelSort - next.parallelSort));
}

export function createEditorNode(
  baseTaskId: string,
  baseTasks: BaseTaskVO[],
  nodes: WorkflowEditorNode[],
): WorkflowEditorNode {
  const baseTask = baseTasks.find((task) => String(task.id) === baseTaskId);
  const nextSort = nodes.length > 0 ? Math.max(...nodes.map((node) => node.sort)) + 1 : 1;

  return {
    localId: `${baseTaskId}-${Date.now()}`,
    baseTaskId,
    customName: baseTask?.name ?? "",
    sort: nextSort,
    parallelSort: 1,
  };
}

export function moveNodeToStage(
  nodes: WorkflowEditorNode[],
  localId: string,
  targetStageIndex: number,
): WorkflowEditorNode[] {
  const normalizedNodes = normalizeNodes(nodes);
  const movingNode = normalizedNodes.find((node) => node.localId === localId);
  if (!movingNode) return normalizedNodes;

  const remainingNodes = normalizedNodes.filter((node) => node.localId !== localId);
  const groups = groupNodes(remainingNodes);
  const boundedIndex = Math.min(Math.max(targetStageIndex, 0), groups.length);

  groups.splice(boundedIndex, 0, [movingNode]);
  const result = groups.flatMap((group, index) =>
    group.map((node, parallelIndex) => ({
      ...node,
      sort: index + 1,
      parallelSort: parallelIndex + 1,
    })),
  );

  return normalizeNodes(result);
}

export function moveNodeToParallelGroup(
  nodes: WorkflowEditorNode[],
  localId: string,
  targetSort: number,
): WorkflowEditorNode[] {
  const normalizedNodes = normalizeNodes(nodes);
  const movingNode = normalizedNodes.find((node) => node.localId === localId);
  if (!movingNode) return normalizedNodes;

  return normalizeNodes(
    normalizedNodes.map((node) =>
      node.localId === localId ? { ...movingNode, sort: targetSort } : node,
    ),
  );
}

export function moveNodeByOffset(
  nodes: WorkflowEditorNode[],
  localId: string,
  offset: number,
): WorkflowEditorNode[] {
  const groups = groupNodes(nodes);
  const currentIndex = groups.findIndex((group) => group.some((node) => node.localId === localId));
  if (currentIndex < 0) return normalizeNodes(nodes);

  return moveNodeToStage(nodes, localId, currentIndex + offset);
}

export const WORKFLOW_STAGE_GAP = 316;
export const WORKFLOW_PARALLEL_GAP = 132;
export const WORKFLOW_START_X = 72;
export const WORKFLOW_START_Y = 80;
export const WORKFLOW_NODE_WIDTH = 224;

export type WorkflowDropTarget =
  | { type: "stage"; stageIndex: number }
  | { type: "parallel"; targetSort: number };

export function getWorkflowDropTarget(
  nodes: WorkflowEditorNode[],
  movingId: string,
  center: { x: number; y: number },
): WorkflowDropTarget {
  const groups = groupNodes(nodes);
  const maxParallelCount = Math.max(1, ...groups.map((group) => group.length));
  const sourceIndex = groups.findIndex((group) => group.some((node) => node.localId === movingId));
  for (const [index, group] of groups.entries()) {
    const columnCenter = WORKFLOW_START_X + index * WORKFLOW_STAGE_GAP + WORKFLOW_NODE_WIDTH / 2;
    const top = WORKFLOW_START_Y + ((maxParallelCount - group.length) / 2) * WORKFLOW_PARALLEL_GAP;
    if (
      index !== sourceIndex &&
      Math.abs(center.x - columnCenter) <= 64 &&
      center.y >= top - 24 &&
      center.y <= top + group.length * WORKFLOW_PARALLEL_GAP
    ) {
      return { type: "parallel", targetSort: group[0].sort };
    }
  }
  let stageIndex = groups.filter(
    (_, index) =>
      center.x > WORKFLOW_START_X + index * WORKFLOW_STAGE_GAP + WORKFLOW_NODE_WIDTH / 2,
  ).length;
  if (sourceIndex >= 0 && groups[sourceIndex].length === 1 && sourceIndex < stageIndex)
    stageIndex -= 1;
  return { type: "stage", stageIndex };
}

export function applyWorkflowDropTarget(
  nodes: WorkflowEditorNode[],
  localId: string,
  target: WorkflowDropTarget,
): WorkflowEditorNode[] {
  return target.type === "parallel"
    ? moveNodeToParallelGroup(nodes, localId, target.targetSort)
    : moveNodeToStage(nodes, localId, target.stageIndex);
}
