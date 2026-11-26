import { memo, useEffect, useState, type ReactElement } from "react";
import type { LucideIcon } from "lucide-react";

import {
  getWorkflowTaskIcon,
  needsDynamicWorkflowIcon,
  resolveWorkflowTaskIcon,
} from "@/lib/workflowVisuals";

interface WorkflowTaskIconProps {
  taskName: string;
  iconName?: string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

const WorkflowTaskIcon = memo(function WorkflowTaskIcon({
  taskName,
  iconName,
  className,
  "aria-hidden": ariaHidden,
}: WorkflowTaskIconProps): ReactElement {
  const syncIcon = getWorkflowTaskIcon(taskName, iconName);
  const [resolved, setResolved] = useState<{ key: string; icon: LucideIcon } | null>(null);
  const cacheKey = `${taskName}\0${iconName ?? ""}`;

  useEffect(() => {
    if (!needsDynamicWorkflowIcon(iconName)) return;
    let cancelled = false;
    void resolveWorkflowTaskIcon(taskName, iconName).then((icon) => {
      if (!cancelled) setResolved({ key: cacheKey, icon });
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, iconName, taskName]);

  const Icon = resolved?.key === cacheKey ? resolved.icon : syncIcon;
  return <Icon className={className} aria-hidden={ariaHidden} />;
});

export default WorkflowTaskIcon;
