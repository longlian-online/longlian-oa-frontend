import { Badge } from "@/components/ui/badge";
import { normalizeProjectMetadataTagColor } from "@/lib/projectMetadata";
import { cn } from "@/lib/utils";
import type {
  ProjectMetadataTag as ProjectMetadataTagData,
  ProjectMetadataTagColor,
} from "@/lib/projectMetadata";

interface ProjectMetadataTagProps {
  tag: ProjectMetadataTagData;
  compact?: boolean;
}

export const PROJECT_METADATA_TAG_COLOR_LABELS: Record<ProjectMetadataTagColor, string> = {
  blue: "蓝色",
  green: "绿色",
  amber: "琥珀色",
  rose: "玫瑰色",
  violet: "紫色",
};

const TAG_COLOR_CLASSES: Record<ProjectMetadataTagColor, string> = {
  blue: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100",
  green:
    "border-green-300 bg-green-100 text-green-950 dark:border-green-700 dark:bg-green-950 dark:text-green-100",
  amber:
    "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  rose: "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100",
  violet:
    "border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100",
};

const TAG_KEY_COLOR_CLASSES: Record<ProjectMetadataTagColor, string> = {
  blue: "bg-blue-200/70 dark:bg-blue-900/70",
  green: "bg-green-200/70 dark:bg-green-900/70",
  amber: "bg-amber-200/70 dark:bg-amber-900/70",
  rose: "bg-rose-200/70 dark:bg-rose-900/70",
  violet: "bg-violet-200/70 dark:bg-violet-900/70",
};

export default function ProjectMetadataTag({ tag, compact = false }: ProjectMetadataTagProps) {
  const color = normalizeProjectMetadataTagColor(tag.color);
  const hasValue = tag.value.trim().length > 0;

  return (
    <Badge
      variant="outline"
      title={hasValue ? `${tag.key}: ${tag.value}` : tag.key}
      className={cn(
        "h-auto min-w-0 max-w-full items-stretch justify-start gap-0 p-0 leading-5",
        compact ? "text-[11px]" : "whitespace-normal",
        color ? TAG_COLOR_CLASSES[color] : "border-primary/35 bg-primary/10 text-foreground",
      )}
    >
      <span
        className={cn(
          "min-w-0 px-2 py-0.5 font-semibold",
          compact ? "max-w-full truncate" : "[overflow-wrap:anywhere]",
          hasValue && (color ? TAG_KEY_COLOR_CLASSES[color] : "bg-primary/15"),
        )}
      >
        {tag.key}
      </span>
      {hasValue && (
        <span
          className={cn(
            "min-w-0 px-2 py-0.5 font-normal",
            compact ? "max-w-full truncate" : "[overflow-wrap:anywhere]",
          )}
        >
          {tag.value}
        </span>
      )}
    </Badge>
  );
}
