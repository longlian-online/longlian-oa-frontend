import type { LucideIcon } from "lucide-react";
import { loadLucideIconCatalog } from "@/lib/lucideIconCatalog";
import {
  BadgeCheck,
  BookOpen,
  Brush,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Code,
  Eye,
  FileText,
  Film,
  Folder,
  Image,
  Languages,
  Layers,
  Megaphone,
  Mic,
  Music,
  Palette,
  PenTool,
  Pencil,
  Scissors,
  Send,
  Sparkles,
  SquarePen,
  Star,
  Type,
  Upload,
  Video,
  Wand2,
  Wrench,
} from "lucide-react";

const COMMON_WORKFLOW_ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  BookOpen,
  Brush,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Code,
  Eye,
  FileText,
  Film,
  Folder,
  Image,
  Languages,
  Layers,
  Megaphone,
  Mic,
  Music,
  Palette,
  PenTool,
  Pencil,
  Scissors,
  Send,
  Sparkles,
  SquarePen,
  Star,
  Type,
  Upload,
  Video,
  Wand2,
  Wrench,
};

const VALID_ICON_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

let dynamicIconsMap: Record<string, LucideIcon> | null = null;
let dynamicIconsPromise: Promise<Record<string, LucideIcon>> | null = null;

function fallbackTaskIcon(taskName: string): LucideIcon {
  if (taskName.includes("翻译") || taskName.includes("校对")) return Languages;
  if (taskName.includes("审核") || taskName.includes("编辑")) return SquarePen;
  if (taskName.includes("发布")) return Megaphone;
  if (taskName.includes("创建")) return BadgeCheck;
  return Star;
}

function lookupLoadedIcon(iconName?: string): LucideIcon | undefined {
  if (!iconName || !VALID_ICON_NAME_PATTERN.test(iconName)) return undefined;
  if (Object.hasOwn(COMMON_WORKFLOW_ICONS, iconName)) {
    return COMMON_WORKFLOW_ICONS[iconName];
  }
  if (dynamicIconsMap && Object.hasOwn(dynamicIconsMap, iconName)) {
    return dynamicIconsMap[iconName];
  }
  return undefined;
}

export function getWorkflowTaskIcon(taskName: string, iconName?: string): LucideIcon {
  return lookupLoadedIcon(iconName) ?? fallbackTaskIcon(taskName);
}

export function needsDynamicWorkflowIcon(iconName?: string): boolean {
  if (!iconName || !VALID_ICON_NAME_PATTERN.test(iconName)) return false;
  if (Object.hasOwn(COMMON_WORKFLOW_ICONS, iconName)) return false;
  if (dynamicIconsMap !== null) return false;
  return true;
}

export async function resolveWorkflowTaskIcon(
  taskName: string,
  iconName?: string,
): Promise<LucideIcon> {
  const loaded = lookupLoadedIcon(iconName);
  if (loaded) return loaded;
  if (!iconName || !VALID_ICON_NAME_PATTERN.test(iconName)) {
    return fallbackTaskIcon(taskName);
  }
  dynamicIconsPromise ??= loadLucideIconCatalog().then((catalog) => {
    dynamicIconsMap = catalog;
    return dynamicIconsMap;
  });
  const registry = await dynamicIconsPromise;
  return Object.hasOwn(registry, iconName) ? registry[iconName]! : fallbackTaskIcon(taskName);
}

export function getWorkflowTaskDescription(
  taskName: string,
  description?: string,
): string | undefined {
  const displayDescription = description?.trim();
  if (!displayDescription || displayDescription === `${taskName}节点`) return undefined;
  return displayDescription;
}
