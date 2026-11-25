import RemoteImage from "@/components/RemoteImage";
import { Button } from "@/components/ui/button";
import { projectThumbnailSrc } from "@/lib/projectThumbnail";
import type { WorkshopProjectInfoVO } from "@/types/workshop";

interface WorkshopProjectCardProps {
  project: WorkshopProjectInfoVO;
  onOpenWorkflow: (project: WorkshopProjectInfoVO) => void;
  onOpenProject: (project: WorkshopProjectInfoVO) => void;
}

function formatTime(value?: string): string {
  if (!value) return "暂无提交";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function WorkshopProjectCard({
  project,
  onOpenWorkflow,
  onOpenProject,
}: WorkshopProjectCardProps) {
  const imageUrl = projectThumbnailSrc(project.thumbnailUrl, project.coverUrl);
  return (
    <article className="group flex min-w-0 items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-[0_1px_3px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] duration-200 hover:border-foreground/18 hover:shadow-[0_6px_20px_rgb(0_0_0/0.06)] dark:shadow-none dark:hover:border-foreground/22">
      <div className="relative size-[76px] shrink-0 overflow-hidden rounded-xl bg-muted after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:ring-1 after:ring-inset after:ring-foreground/8">
        {imageUrl ? (
          <RemoteImage
            src={imageUrl}
            alt={project.title}
            className="size-full transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.04]"
            fallback={
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-secondary text-lg font-semibold text-muted-foreground/80">
                {project.title.slice(0, 1)}
              </div>
            }
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-secondary text-lg font-semibold text-muted-foreground/80">
            {project.title.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">
          {project.title}
        </h3>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          最近提交：{formatTime(project.lastSubmitterAt)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => onOpenWorkflow(project)}
          >
            打开项目列表
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full border-border/80 px-3 text-xs"
            onClick={() => onOpenProject(project)}
          >
            查看企划
          </Button>
        </div>
      </div>
    </article>
  );
}
