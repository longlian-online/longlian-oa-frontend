import { ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { WorkshopProjectInfoVO } from "@/types/workshop";

interface WorkshopProjectCardProps {
  project: WorkshopProjectInfoVO;
  onClick: (project: WorkshopProjectInfoVO) => void;
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

export function WorkshopProjectCard({ project, onClick }: WorkshopProjectCardProps) {
  return (
    <article className="group flex min-h-[190px] flex-col rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-foreground/20">
      <div className="flex min-w-0 items-start gap-3">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
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
          <h2 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">
            {project.title}
          </h2>
          <div className="mt-3 flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={project.creatorAvatarUrl} />
              <AvatarFallback className="text-xs">{project.title.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {project.lastSubmitterUsername || "暂无提交成员"}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            最近提交：{formatTime(project.lastSubmitterAt)}
          </p>
        </div>
      </div>

      <div className="mt-auto flex justify-end pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => onClick(project)}
        >
          查看企划
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </article>
  );
}
