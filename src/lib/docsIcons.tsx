import {
  BookOpen,
  CircleHelp,
  ClipboardCheck,
  FolderKanban,
  Settings,
  UserRoundPlus,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

const docsIcons: Record<string, LucideIcon> = {
  BookOpen,
  CircleHelp,
  ClipboardCheck,
  FolderKanban,
  Settings,
  UserRoundPlus,
  UsersRound,
  Workflow,
};

export function getDocsIcon(name?: string): ReactNode {
  const Icon = name && Object.hasOwn(docsIcons, name) ? docsIcons[name] : undefined;
  return Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : undefined;
}
