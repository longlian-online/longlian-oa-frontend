import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import {
  BarChart3,
  CirclePlus,
  Info,
  Link2,
  Loader2,
  Pencil,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { scopedKey } from "@/lib/queryKeys";
import {
  addProjectToWorkshop,
  createProjectDeletionRequest,
  deleteProject,
  removeProjectFromWorkshop,
} from "@/api/planning";
import { projectDetailQuery } from "@/queries/planning";
import ProjectItemSection from "@/components/ProjectItem";
import ProjectMetadataTag from "@/components/ProjectMetadataTag";
import RemoteImage from "@/components/RemoteImage";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDate } from "@/lib/format";
import { getStatusLabel } from "@/lib/projectStatus";
import { parseProjectMetadataTags } from "@/lib/projectMetadata";

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const projectQuery = useApiQuery(projectDetailQuery(projectId));
  const project = projectQuery.data;
  const loading = projectQuery.isLoading;
  const workshopMutation = useApiMutation({
    mutationFn: (remove: boolean) =>
      remove ? removeProjectFromWorkshop(projectId!) : addProjectToWorkshop(projectId!),
    invalidate: [["projects"], ["workshop"], ["plaza"]],
  });
  const workshopLoading = workshopMutation.isPending;
  const workshopLock = useRef(false);
  const deleteMutation = useApiMutation({
    mutationFn: () => deleteProject(projectId!),
    invalidate: [["projects", "list"], ["projects", "management"], ["workshop"], ["plaza"]],
  });
  const deleteLoading = deleteMutation.isPending;
  const deleteLock = useRef(false);
  const requestMutation = useApiMutation({
    mutationFn: (reason: string) => createProjectDeletionRequest(projectId!, reason),
    invalidate: [["deletionRequests"]],
  });
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (projectQuery.isError && !project) {
    return (
      <div role="alert">
        {projectQuery.error.message}
        <button onClick={() => void projectQuery.refetch()}>重试</button>
      </div>
    );
  }
  async function handleToggleWorkshop(): Promise<void> {
    if (workshopLock.current) return;
    if (!project || !projectId) return;

    if (project.inWorkshop) {
      const confirmed = await confirm({
        title: "退出企划？",
        description: "退出后可以在企划详情里重新加入。",
        confirmText: "退出企划",
      });
      if (!confirmed) return;
    }

    if (workshopLock.current) return;
    workshopLock.current = true;
    try {
      if (project.inWorkshop) {
        await workshopMutation.mutateAsync(true);
        $tip("已退出企划", "success");
      } else {
        await workshopMutation.mutateAsync(false);
        $tip("已加入企划", "success");
      }
    } catch {
      /* 全局 Mutation 错误提示保留当前数据。 */
    } finally {
      workshopLock.current = false;
    }
  }

  async function handleShare(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      $tip("企划链接已复制", "success");
    } catch {
      $tip("复制链接失败，请手动复制当前地址", "error");
    }
  }

  async function handleDelete(): Promise<void> {
    if (deleteLock.current || !project || !projectId) return;
    if (project.hasItems) {
      setReason("");
      setReasonOpen(true);
      return;
    }
    const confirmed = await confirm({
      title: "删除企划？",
      description: `删除后「${project.title}」将不可恢复。`,
      confirmText: "删除",
    });
    if (!confirmed || deleteLock.current) return;
    deleteLock.current = true;
    try {
      await deleteMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: scopedKey(["projects", "detail", projectId], "org"),
        refetchType: "none",
      });
      $tip("企划已删除", "success");
      void navigate("/dashboard/planning");
    } catch {
      /* 全局 Mutation 错误提示保留当前数据。 */
    } finally {
      deleteLock.current = false;
    }
  }

  async function handleSubmitDeletionRequest(): Promise<void> {
    const trimmed = reason.trim();
    if (!trimmed || deleteLock.current) return;
    deleteLock.current = true;
    try {
      await requestMutation.mutateAsync(trimmed);
      setReasonOpen(false);
      $tip("已提交删除申请，请等待组织管理员审核", "success");
    } catch {
      /* 全局 Mutation 错误提示保留当前数据。 */
    } finally {
      deleteLock.current = false;
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
          {!(project.isCreator && project.inWorkshop) && (
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
              {project.inWorkshop ? "退出企划" : "加入企划"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => void handleShare()}
          >
            <Share2 className="h-4 w-4" />
            分享
          </Button>
          {project.isCreator && (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteLoading || requestMutation.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteLoading || requestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              删除企划
            </Button>
          )}
        </div>
      </div>

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除企划？</DialogTitle>
            <DialogDescription>由于企划中已存在项目，删除需要管理员审核</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            maxLength={500}
            placeholder="填写删除原因"
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || requestMutation.isPending}
              onClick={() => void handleSubmitDeletionRequest()}
            >
              提交申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="aspect-[2/3] bg-muted">
              {project.coverUrl ? (
                <RemoteImage
                  src={project.coverUrl}
                  alt={project.title}
                  className="size-full"
                  fallback="暂无封面"
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
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">创建时间</span>
                <span className="font-medium text-foreground">{formatDate(project.createdAt)}</span>
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
              标签
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <ProjectMetadataTag key={index} tag={tag} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无标签</p>
            )}
          </section>

          <ProjectItemSection projectId={projectId!} isCreator={project.isCreator} showDetailLink />
        </main>
      </div>
    </div>
  );
}
