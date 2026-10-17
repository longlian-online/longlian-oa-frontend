export interface SlotPosition {
  name: string;
  slotIndex?: number | null;
  slotTotal?: number | null;
  serialStep?: number | null;
}

export interface SlotNode {
  id: string;
  name: string;
  sort: number;
  parallelSort: number;
}

/** 并行槽多于 1 时追加「· i/n」；同名跨阶段时写作「名称（第 N 步）」。单槽不补号。 */
export function formatSlotLabel(slot: SlotPosition): string {
  const named =
    slot.serialStep != null && slot.serialStep > 0
      ? `${slot.name}（第 ${slot.serialStep} 步）`
      : slot.name;
  const total = slot.slotTotal ?? 1;
  if (total > 1) {
    return `${named} · ${slot.slotIndex ?? 1}/${total}`;
  }
  return named;
}

export function formatTaskTitle(itemTitle: string, slot: SlotPosition): string {
  const label = formatSlotLabel(slot);
  const title = itemTitle.trim();
  return title ? `${title} · ${label}` : label;
}

export function slotPosition(node: SlotNode, nodes: SlotNode[]): SlotPosition {
  const stage = nodes
    .filter((candidate) => candidate.sort === node.sort)
    .sort((prev, next) => prev.parallelSort - next.parallelSort || compareNodeId(prev.id, next.id));
  const found = stage.findIndex((candidate) => candidate.id === node.id);
  const sorts = [
    ...new Set(
      nodes.filter((candidate) => candidate.name === node.name).map((candidate) => candidate.sort),
    ),
  ].sort((prev, next) => prev - next);
  return {
    name: node.name,
    slotIndex: found >= 0 ? found + 1 : 1,
    slotTotal: Math.max(stage.length, 1),
    serialStep: sorts.length > 1 ? sorts.indexOf(node.sort) + 1 : null,
  };
}

function compareNodeId(prev: string, next: string): number {
  if (/^\d+$/.test(prev) && /^\d+$/.test(next)) {
    return prev.length === next.length
      ? prev < next
        ? -1
        : prev > next
          ? 1
          : 0
      : prev.length - next.length;
  }
  return prev.localeCompare(next);
}
