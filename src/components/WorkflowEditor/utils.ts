import type {
  BaseTaskVO,
  WorkshopTaskTemplateNodeCreateDTO,
  WorkshopTaskTemplateNodeVO,
} from "@/types/workflowTemplate";

export interface WorkflowEditorValue {
  nodes: WorkshopTaskTemplateNodeCreateDTO[];
}

export interface WorkflowEditorNode {
  localId: string;
  baseTaskId: string;
  customName: string;
  sort: number;
  parallelSort: number;
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

  const result: WorkflowEditorNode[] = [];
  groups.forEach((group, index) => {
    if (index === boundedIndex) {
      result.push({ ...movingNode, sort: result.length + 1, parallelSort: 1 });
    }
    result.push(...group);
  });

  if (boundedIndex === groups.length) {
    result.push({ ...movingNode, sort: result.length + 1, parallelSort: 1 });
  }

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
