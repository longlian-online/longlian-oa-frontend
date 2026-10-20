import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronRight, Loader2, Plus, Trash2, Workflow } from "lucide-react";

import {
  createItemDeletionRequest,
  createProjectItem,
  deleteProjectItem,
  getTaskTemplateOptions,
} from "@/api/projectItem";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { PROJECT_ITEMS_PAGE_SIZE as PAGE_SIZE, projectItemsQuery } from "@/queries/planning";
import ProjectItemNodeList from "./ProjectItemNodeList";

import type { ProjectItemListVO } from "@/types/projectItem";

interface ProjectItemSectionProps {
  projectId: string;
  isCreator?: boolean;
  renderHeader?: (onCreate: () => void) => ReactNode;
}

interface ProjectItemForm {
  title: string;
  taskTemplateId: string;
}

export default function ProjectItemSection({
  projectId,
  isCreator = false,
  renderHeader,
}: ProjectItemSectionProps) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [{ page, status, orderDir }, setQuery] = useState<{
    page: number;
    status: "IN_PROGRESS" | "COMPLETED" | "";
    orderDir: "ASC" | "DESC";
  }>({ page: 1, status: "IN_PROGRESS", orderDir: "DESC" });
  function setPage(nextPage: number): void {
    setQuery((query) => ({ ...query, page: nextPage }));
  }
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reasonItem, setReasonItem] = useState<ProjectItemListVO | null>(null);
  const [reason, setReason] = useState("");
  const actionLock = useRef(false);
  const projectLifecycle = useRef({ id: projectId, generation: 0 });
  if (projectLifecycle.current.id !== projectId) {
    projectLifecycle.current = {
      id: projectId,
      generation: projectLifecycle.current.generation + 1,
    };
  }
  const generation = projectLifecycle.current.generation;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = (): boolean =>
    mounted.current && projectLifecycle.current.generation === generation;
  const itemsQuery = useApiQuery(projectItemsQuery(projectId, page, status, orderDir));
  const templatesQuery = useApiQuery({
    key: ["templateOptions"],
    queryFn: getTaskTemplateOptions,
    enabled: dialogOpen,
    staleTime: 300_000,
  });
  const createMutation = useApiMutation({
    mutationFn: (dto: ProjectItemForm) => createProjectItem(projectId, dto),
    invalidate: [["items"], ["projects"], ["workshop"], ["plaza"]],
  });
  const deleteMutation = useApiMutation({
    mutationFn: (id: string) => deleteProjectItem(projectId, id),
    invalidate: [
      ["items"],
      ["projects"],
      ["flow"],
      ["instances"],
      ["taskDetail"],
      ["workshop"],
      ["plaza"],
    ],
  });
  const requestMutation = useApiMutation({
    mutationFn: (input: { itemId: string; reason: string }) =>
      createItemDeletionRequest(projectId, input.itemId, input.reason),
    invalidate: [["deletionRequests"]],
  });
  const items = itemsQuery.data?.list ?? [];
  const total = itemsQuery.data?.total ?? 0;
  const templates = templatesQuery.data ?? [];
  const loading = itemsQuery.isLoading;
  const templateLoading = templatesQuery.isLoading;
  const saving = createMutation.isPending;
  const mutatingItemId = deleteMutation.isPending ? deleteMutation.variables : null;
  const [form, setForm] = useState<ProjectItemForm>({
    title: "",
    taskTemplateId: "",
  });

  const canCreate = useMemo(
    () => Boolean(form.title.trim() && form.taskTemplateId && !saving),
    [form.taskTemplateId, form.title, saving],
  );

  function openCreateDialog(): void {
    setForm({ title: "", taskTemplateId: "" });
    setDialogOpen(true);
  }

  async function handleCreateItem(): Promise<void> {
    if (!canCreate || actionLock.current) return;
    actionLock.current = true;

    try {
      await createMutation.mutateAsync({
        title: form.title.trim(),
        taskTemplateId: form.taskTemplateId,
      });
      if (!isCurrent()) return;
      $tip("项目已创建", "success");
      setDialogOpen(false);
      setPage(1);
    } catch {
      // Mutation 的最终失败由共享错误入口提示，保留当前草稿。
    } finally {
      actionLock.current = false;
    }
  }

  async function handleDeleteItem(item: ProjectItemListVO): Promise<void> {
    if (item.hasSubmittedTask) {
      setReason("");
      setReasonItem(item);
      return;
    }
    const confirmed = await confirm({
      title: "删除项目？",
      description: `删除后「${item.title}」的流程与任务记录将不可恢复。`,
      confirmText: "删除",
    });
    if (!confirmed || actionLock.current) return;
    actionLock.current = true;

    try {
      await deleteMutation.mutateAsync(item.id);
      if (!isCurrent()) return;
      $tip("项目已删除", "success");
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch {
      // Mutation 的最终失败由共享错误入口提示，保留当前草稿。
    } finally {
      actionLock.current = false;
    }
  }

  async function handleSubmitItemDeletion(): Promise<void> {
    const trimmed = reason.trim();
    if (!reasonItem || !trimmed || actionLock.current) return;
    actionLock.current = true;
    try {
      await requestMutation.mutateAsync({ itemId: reasonItem.id, reason: trimmed });
      if (!isCurrent()) return;
      setReasonItem(null);
      $tip("已提交删除申请，请等待组织管理员审核", "success");
    } catch {
      // Mutation 的最终失败由共享错误入口提示，保留当前数据。
    } finally {
      actionLock.current = false;
    }
  }

  return (
    <>
      {renderHeader?.(openCreateDialog)}
      <section
        id="project-workspace"
        aria-labelledby="project-workspace-title"
        className="scroll-mt-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2
              id="project-workspace-title"
              tabIndex={-1}
              className="flex items-center gap-2 rounded-sm text-base font-semibold text-foreground outline-none data-[locate-highlight]:ring-2 data-[locate-highlight]:ring-ring data-[locate-highlight]:ring-offset-4"
            >
              <Workflow className="h-4 w-4 text-muted-foreground" />
              项目
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isCreator && !renderHeader && (
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                创建项目
              </Button>
            )}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={status || "ALL"}
            onValueChange={(value) => {
              if (value === "IN_PROGRESS" || value === "COMPLETED" || value === "ALL") {
                setQuery((query) => ({ ...query, status: value === "ALL" ? "" : value, page: 1 }));
              }
            }}
          >
            <TabsList variant="line" aria-label="项目完成情况">
              <TabsTrigger value="IN_PROGRESS">进行中</TabsTrigger>
              <TabsTrigger value="COMPLETED">已完成</TabsTrigger>
              <TabsTrigger value="ALL">全部</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={orderDir}
            onValueChange={(value) => {
              if (value === "ASC" || value === "DESC") {
                setQuery((query) => ({ ...query, orderDir: value, page: 1 }));
              }
            }}
          >
            <SelectTrigger size="sm" aria-label="发布时间排序">
              <SelectValue>{orderDir === "ASC" ? "最早发布" : "最新发布"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASC">最早发布</SelectItem>
              <SelectItem value="DESC">最新发布</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在加载项目...
          </div>
        ) : itemsQuery.isError && !itemsQuery.data ? (
          <div className="py-8 text-center">
            <p>项目加载失败</p>
            <Button onClick={() => void itemsQuery.refetch()}>重新加载</Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Workflow className="h-5 w-5 text-muted-foreground" />}
            title="暂无项目"
            description="创建项目后，成员就可以围绕流程节点推进任务。"
            className="min-h-44"
            action={
              isCreator ? (
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  创建项目
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="flex flex-col divide-y border-y">
            {items.map((item) => (
              <article
                key={item.id}
                className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    当前阶段：{item.currentNodeName || "尚未开始"}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col gap-3 sm:col-span-2 sm:row-start-2 lg:col-span-1 lg:row-start-auto">
                  <ProjectItemNodeList nodes={item.nodes} />
                  <div className="flex items-center gap-3">
                    <Progress
                      value={item.progressPercent}
                      aria-label={`${item.title}进度`}
                      className="flex-1"
                    />
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {item.progressPercent}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 sm:col-start-2 sm:row-start-1 lg:col-start-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      void navigate(`/dashboard/planning/${projectId}/items/${item.id}`, {
                        state: location.state,
                      })
                    }
                  >
                    进入任务
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                  {isCreator && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除项目：${item.title}`}
                      title="删除项目"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={mutatingItemId === item.id}
                      onClick={() => void handleDeleteItem(item)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          disabled={loading}
          className="pt-4"
          onPageChange={setPage}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建项目</DialogTitle>
              <DialogDescription>
                项目必须绑定一个流程模板，创建后会生成对应任务流。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">项目名</label>
                <Input
                  placeholder="例如：第一话翻译"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">流程模板</label>
                <Select
                  value={form.taskTemplateId}
                  onValueChange={(value: string | null) =>
                    setForm({ ...form, taskTemplateId: value || "" })
                  }
                  disabled={templateLoading}
                >
                  <SelectTrigger className="w-full" disabled={templateLoading}>
                    {templateLoading ? (
                      <span className="flex flex-1 items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在加载模板
                      </span>
                    ) : (
                      <SelectValue placeholder="选择流程模板" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button disabled={!canCreate} onClick={() => void handleCreateItem()}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={reasonItem !== null} onOpenChange={(open) => !open && setReasonItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>删除项目？</DialogTitle>
              <DialogDescription>由于项目存在已提交任务，删除需要管理员审核</DialogDescription>
            </DialogHeader>
            <Textarea
              value={reason}
              maxLength={500}
              placeholder="填写删除原因"
              onChange={(event) => setReason(event.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReasonItem(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                disabled={!reason.trim() || requestMutation.isPending}
                onClick={() => void handleSubmitItemDeletion()}
              >
                提交申请
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
}
