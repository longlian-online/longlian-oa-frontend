import { Button } from "@/components/ui/button";
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
  return (
    <article className="group flex min-w-0 items-start gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-foreground/20">
      <div className="h-[72px] w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {project.coverUrl ? (
          <img
            src={project.coverUrl}
            alt={project.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {project.title.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground">{project.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          最近提交：{formatTime(project.lastSubmitterAt)}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onOpenWorkflow(project)}>
            打开任务流
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onOpenProject(project)}
          >
            查看企划
          </Button>
        </div>
      </div>
    </article>
  );
}
