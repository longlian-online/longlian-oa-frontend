import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BookOpen,
  Clapperboard,
  Image,
  Languages,
  Megaphone,
  PenLine,
  SquarePen,
  Star,
} from "lucide-react";

export const WORKFLOW_ICON_OPTIONS = [
  { name: "BadgeCheck", label: "创建", icon: BadgeCheck },
  { name: "Languages", label: "翻译", icon: Languages },
  { name: "SquarePen", label: "审核", icon: SquarePen },
  { name: "PenLine", label: "嵌字", icon: PenLine },
  { name: "Megaphone", label: "发布", icon: Megaphone },
  { name: "BookOpen", label: "文本", icon: BookOpen },
  { name: "Image", label: "美术", icon: Image },
  { name: "Clapperboard", label: "视频", icon: Clapperboard },
  { name: "Star", label: "通用", icon: Star },
] as const;

const WORKFLOW_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  WORKFLOW_ICON_OPTIONS.map(({ name, icon }) => [name, icon]),
);

export function getWorkflowTaskIcon(taskName: string, iconName?: string): LucideIcon {
  const selectedIcon = iconName && WORKFLOW_ICON_MAP[iconName];
  if (selectedIcon) return selectedIcon;

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
