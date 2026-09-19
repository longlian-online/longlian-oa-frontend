import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BarChart3, CirclePlus, Info, Link2, Loader2, Pencil, Share2, X } from "lucide-react";

import { addProjectToWorkshop, getProjectDetail, removeProjectFromWorkshop } from "@/api/planning";
import ProjectItemSection from "@/components/ProjectItem";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useConfirm } from "@/hooks/useConfirm";
import { parseProjectMetadataTags } from "@/lib/projectMetadata";
import type { ProjectDetailInfoVO, ProjectStatus } from "@/types/planning";

function getStatusLabel(status: ProjectStatus): string {
  if (status === "COMPLETED" || status === "已完成") return "已完成";
  if (status === "ARCHIVED" || status === "已归档") return "已归档";
  return "进行中";
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [project, setProject] = useState<ProjectDetailInfoVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [workshopLoading, setWorkshopLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      void loadProjectDetail();
    }
  }, [projectId]);

  async function loadProjectDetail(): Promise<void> {
    try {
      setLoading(true);
      const data = await getProjectDetail(projectId!);
      setProject(data);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "企划加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleWorkshop(): Promise<void> {
    if (!project || !projectId) return;

    if (project.inWorkshop) {
      const confirmed = await confirm({
        title: "从工坊移除企划？",
        description: "移除后可以在企划详情里重新添加。",
        confirmText: "移除",
      });
      if (!confirmed) return;
    }

    try {
      setWorkshopLoading(true);
      if (project.inWorkshop) {
        await removeProjectFromWorkshop(projectId);
        $tip("已从工坊移除", "success");
      } else {
        await addProjectToWorkshop(projectId);
        $tip("已添加到工坊", "success");
      }
      await loadProjectDetail();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "工坊状态更新失败", "error");
    } finally {
      setWorkshopLoading(false);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">加载中...</div>;
  }

  if (!project) {
    return <div className="py-8 text-center text-muted-foreground">企划不存在</div>;
  }

  const tags = parseProjectMetadataTags(project.metadata);
  const statusLabel = getStatusLabel(project.status);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {project.title}
              </h1>
              <Badge variant="outline">{statusLabel}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {project.alias || project.typeName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.isCreator && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void navigate(`/dashboard/planning/${project.id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
              编辑
            </Button>
          )}
          <Button
            variant={project.inWorkshop ? "secondary" : "default"}
            size="sm"
            disabled={workshopLoading}
            onClick={handleToggleWorkshop}
          >
            {workshopLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : project.inWorkshop ? (
              <X className="h-4 w-4" />
            ) : (
              <CirclePlus className="h-4 w-4" />
            )}
            {project.inWorkshop ? "移出工坊" : "添加到工坊"}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Share2 className="h-4 w-4" />
            分享
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="aspect-[2/3] bg-muted">
              {project.coverUrl ? (
                <img
                  src={project.coverUrl}
                  alt={project.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  暂无封面
                </div>
              )}
            </div>
          </div>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" />
              基础信息
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">类型</span>
                <span className="font-medium text-foreground">{project.typeName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">状态</span>
                <span className="font-medium text-foreground">{statusLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">工坊</span>
                <span className="font-medium text-foreground">
                  {project.inWorkshop ? "已添加" : "未添加"}
                </span>
              </div>
            </div>
          </section>
        </aside>

        <main className="space-y-4">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  进度
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{project.progressPercent}%</span>
                  <Progress value={project.progressPercent} className="h-1.5 flex-1" />
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">待提交</div>
                <div className="mt-2 text-2xl font-semibold">{project.claimedTaskCount}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">待接取</div>
                <div className="mt-2 text-2xl font-semibold">{project.pendingTaskCount}</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              简介
            </div>
            <p className="text-sm leading-7 text-foreground">{project.description || "暂无简介"}</p>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" />
              元信息
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={`${tag.key}-${index}`} variant="outline" className="font-normal">
                    <span className="text-muted-foreground">{tag.key}</span>
                    <span className="ml-1 text-foreground">{tag.value}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无元信息</p>
            )}
          </section>

          <ProjectItemSection
            projectId={projectId!}
            isCreator={project.isCreator}
            showDetailLink
            onChanged={loadProjectDetail}
          />
        </main>
      </div>
    </div>
  );
}
