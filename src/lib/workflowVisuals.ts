import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Languages, Megaphone, SquarePen, Star } from "lucide-react";

export function getWorkflowTaskIcon(taskName: string): LucideIcon {
  if (taskName.includes("翻译") || taskName.includes("校对")) return Languages;
  if (taskName.includes("审核") || taskName.includes("编辑")) return SquarePen;
  if (taskName.includes("发布")) return Megaphone;
  if (taskName.includes("创建")) return BadgeCheck;
  return Star;
}

export function getWorkflowTaskDescription(
  taskName: string,
  description?: string,
): string | undefined {
  const displayDescription = description?.trim();
  if (!displayDescription || displayDescription === `${taskName}节点`) return undefined;
  return displayDescription;
}
