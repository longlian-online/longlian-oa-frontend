import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Menu } from "@base-ui/react/menu";
import {
  BookOpen,
  ChevronDown,
  CirclePlus,
  Ellipsis,
  Loader2,
  Pencil,
  Plus,
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
import PlanningDetailNavigation from "@/components/PlanningDetailNavigation";
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
  const [searchParams] = useSearchParams();
  const browseView = searchParams.get("view") === "about";
  const pageRef = useRef<HTMLDivElement>(null);
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
      variant: "destructive",
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
    <div
      ref={pageRef}
      className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_8rem] items-start gap-8"
    >
      <div className="flex min-w-0 flex-col gap-8">
        <ProjectItemSection
          key={projectId}
          projectId={projectId!}
          isCreator={project.isCreator}
          renderHeader={(onCreate) => (
            <header id="project-overview" className="flex scroll-mt-6 flex-col gap-5 border-b pb-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                    {project.coverUrl ? (
                      <RemoteImage
                        src={project.coverUrl}
                        alt={project.title}
                        className="size-full"
                        fallback={<BookOpen className="size-5" />}
                      />
                    ) : (
                      <BookOpen className="size-5" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1
                        tabIndex={-1}
                        className="break-words rounded-sm text-xl font-semibold tracking-tight text-foreground outline-none data-[locate-highlight]:ring-2 data-[locate-highlight]:ring-ring data-[locate-highlight]:ring-offset-4 sm:text-2xl"
                      >
                        {project.title}
                      </h1>
                      <Badge variant="outline">{statusLabel}</Badge>
                    </div>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span>{project.typeName}</span>
                      {project.alias && <span>· {project.alias}</span>}
                      {(project.isCreator || project.inWorkshop) && (
                        <span>· {project.isCreator ? "负责人" : "已加入"}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {project.isCreator ? (
                    <>
                      <Button onClick={onCreate}>
                        <Plus data-icon="inline-start" />
                        创建项目
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void navigate(`/dashboard/planning/${project.id}/edit`)}
                      >
                        <Pencil data-icon="inline-start" />
                        编辑资料
                      </Button>
                    </>
                  ) : !project.inWorkshop ? (
                    <Button disabled={workshopLoading} onClick={handleToggleWorkshop}>
                      {workshopLoading ? <Loader2 className="animate-spin" /> : <CirclePlus />}
                      加入企划
                    </Button>
                  ) : null}
                  <Menu.Root>
                    <Menu.Trigger render={<Button variant="ghost" />}>
                      更多
                      <Ellipsis data-icon="inline-end" />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner align="end" sideOffset={6}>
                        <Menu.Popup className="min-w-40 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none">
                          <Menu.Group>
                            <Menu.Item
                              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 outline-none data-highlighted:bg-muted"
                              onClick={() => void handleShare()}
                            >
                              <Share2 className="size-4" />
                              分享企划
                            </Menu.Item>
                            {project.isCreator && !project.inWorkshop && (
                              <Menu.Item
                                disabled={workshopLoading}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 outline-none data-disabled:opacity-50 data-highlighted:bg-muted"
                                onClick={() => void handleToggleWorkshop()}
                              >
                                <CirclePlus className="size-4" />
                                加入企划
                              </Menu.Item>
                            )}
                            {!project.isCreator && project.inWorkshop && (
                              <Menu.Item
                                disabled={workshopLoading}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 outline-none data-disabled:opacity-50 data-highlighted:bg-muted"
                                onClick={() => void handleToggleWorkshop()}
                              >
                                <X className="size-4" />
                                退出企划
                              </Menu.Item>
                            )}
                          </Menu.Group>
                          {project.isCreator && (
                            <>
                              <Menu.Separator className="my-1 h-px bg-border" />
                              <Menu.Group>
                                <Menu.Item
                                  disabled={deleteLoading || requestMutation.isPending}
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-destructive outline-none data-disabled:opacity-50 data-highlighted:bg-destructive/10"
                                  onClick={() => void handleDelete()}
                                >
                                  <Trash2 className="size-4" />
                                  删除企划
                                </Menu.Item>
                              </Menu.Group>
                            </>
                          )}
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </div>
              </div>
              {browseView && project.description && (
                <p className="line-clamp-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {project.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">整体进度</span>
                  <span className="font-medium tabular-nums">{project.progressPercent}%</span>
                  <Progress
                    value={project.progressPercent}
                    aria-label="企划整体进度"
                    className="w-24"
                  />
                </div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                  <span>企划任务</span>
                  <span>
                    待提交{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {project.claimedTaskCount}
                    </span>
                  </span>
                  <span>
                    待接取{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {project.pendingTaskCount}
                    </span>
                  </span>
                </p>
              </div>
            </header>
          )}
        />

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

        <section aria-labelledby="project-info-title" className="border-t pt-6">
          <details
            key={`${projectId}-${browseView}`}
            id="project-info"
            open={browseView}
            className="peer group scroll-mt-6"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-md py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <h2
                tabIndex={-1}
                id="project-info-title"
                className="rounded-sm text-base font-semibold outline-none data-[locate-highlight]:ring-2 data-[locate-highlight]:ring-ring data-[locate-highlight]:ring-offset-4"
              >
                关于作品
              </h2>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="group-open:hidden">展开完整资料</span>
                <span className="hidden group-open:inline">收起资料</span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </span>
            </summary>
            <div className="mt-5 grid items-start gap-6 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="flex min-w-0 flex-col gap-5">
                {project.description && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {project.description}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2" aria-label="作品标签">
                    {tags.map((tag, index) => (
                      <ProjectMetadataTag key={index} tag={tag} />
                    ))}
                  </div>
                )}
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">类型</dt>
                  <dd>{project.typeName}</dd>
                  {project.alias && (
                    <>
                      <dt className="text-muted-foreground">别名</dt>
                      <dd className="break-words">{project.alias}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">状态</dt>
                  <dd>{statusLabel}</dd>
                  <dt className="text-muted-foreground">工坊</dt>
                  <dd>{project.inWorkshop ? "已加入" : "未加入"}</dd>
                  <dt className="text-muted-foreground">创建时间</dt>
                  <dd>{formatDate(project.createdAt)}</dd>
                </dl>
              </div>
              <div className="aspect-[2/3] w-full max-w-64 overflow-hidden rounded-lg bg-muted">
                {project.coverUrl ? (
                  <RemoteImage
                    src={project.coverUrl}
                    alt={`${project.title}完整封面`}
                    className="size-full"
                    fit="contain"
                    loading="lazy"
                    fallback="暂无封面"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    暂无封面
                  </div>
                )}
              </div>
            </div>
          </details>
          <div className="mt-3 flex flex-col gap-3 peer-open:hidden">
            {project.description && (
              <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">
                {project.description}
              </p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="作品标签摘要">
                {tags.slice(0, 4).map((tag, index) => (
                  <ProjectMetadataTag key={index} tag={tag} />
                ))}
                {tags.length > 4 && (
                  <span className="self-center text-xs text-muted-foreground">
                    另有 {tags.length - 4} 个标签，展开查看
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      <PlanningDetailNavigation key={projectId} pageRef={pageRef} />
    </div>
  );
}
