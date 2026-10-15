import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Loader2, Plus, Send, Trash2, Workflow } from "lucide-react";

import {
  createProjectItem,
  deleteProjectItem,
  getProjectItemList,
  getTaskTemplateOptions,
  publishProjectItem,
} from "@/api/projectItem";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

import type {
  ProjectItemListVO,
  ProjectItemNodeState,
  ProjectItemNodeVO,
  ProjectItemStatus,
} from "@/types/projectItem";

const PAGE_SIZE = 4;

interface ProjectItemSectionProps {
  projectId: string;
  isCreator?: boolean;
  showDetailLink?: boolean;
}

interface ProjectItemForm {
  title: string;
  taskTemplateId: string;
}

const STATUS_LABELS: Record<ProjectItemStatus, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  PUBLISHED: "已发布",
};

const NODE_LABELS: Record<ProjectItemNodeState, string> = {
  COMPLETED: "完成",
  IN_PROGRESS: "当前",
  LOCKED: "锁定",
};

function getStatusVariant(status: ProjectItemStatus): "default" | "secondary" | "outline" {
  if (status === "PUBLISHED") return "default";
  if (status === "COMPLETED") return "secondary";
  return "outline";
}

function sortNodes(nodes: ProjectItemNodeVO[]): ProjectItemNodeVO[] {
  return [...nodes].sort((prev, next) => {
    if (prev.sort !== next.sort) return prev.sort - next.sort;
    return prev.parallelSort - next.parallelSort;
  });
}

function ProjectItemNodeList({ nodes }: { nodes: ProjectItemNodeVO[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无节点信息</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {sortNodes(nodes).map((node, index) => (
        <div
          key={`${node.sort}-${node.parallelSort}-${node.name}`}
          className={cn(
            "flex max-w-full items-center gap-1 text-xs",
            node.state === "IN_PROGRESS" ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="max-w-24 truncate">{node.name}</span>
          {node.parallelCount > 1 && (
            <span className="text-[10px] text-muted-foreground">+{node.parallelCount - 1}</span>
          )}
          <span className="sr-only">{NODE_LABELS[node.state]}</span>
          {index < nodes.length - 1 && <span className="ml-0.5 text-border">/</span>}
        </div>
      ))}
    </div>
  );
}

export default function ProjectItemSection({
  projectId,
  isCreator = false,
  showDetailLink = false,
}: ProjectItemSectionProps) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [{ page, status, orderDir }, setQuery] = useState<{
    page: number;
    status: "IN_PROGRESS" | "PUBLISHED" | "";
    orderDir: "ASC" | "DESC";
  }>({ page: 1, status: "IN_PROGRESS", orderDir: "DESC" });
  function setPage(nextPage: number): void {
    setQuery((query) => ({ ...query, page: nextPage }));
  }
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const itemsQuery = useApiQuery({
    key: [
      "items",
      "list",
      projectId,
      { pageNum: page, pageSize: PAGE_SIZE, status, sortByTime: "CREATE", orderDir },
    ],
    queryFn: () =>
      getProjectItemList(projectId, {
        pageNum: page,
        pageSize: PAGE_SIZE,
        status,
        sortByTime: "CREATE",
        orderDir,
      }),
    enabled: Boolean(projectId),
  });
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
  const itemMutation = useApiMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      publish ? publishProjectItem(projectId, id) : deleteProjectItem(projectId, id),
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
  const items = itemsQuery.data?.list ?? [];
  const total = itemsQuery.data?.total ?? 0;
  const templates = templatesQuery.data ?? [];
  const loading = itemsQuery.isLoading;
  const templateLoading = templatesQuery.isLoading;
  const saving = createMutation.isPending;
  const mutatingItemId = itemMutation.isPending ? itemMutation.variables?.id : null;
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
    const confirmed = await confirm({
      title: "删除项目？",
      description: `删除后「${item.title}」的流程与任务记录将不可恢复。`,
      confirmText: "删除",
    });
    if (!confirmed || actionLock.current) return;
    actionLock.current = true;

    try {
      await itemMutation.mutateAsync({ id: item.id, publish: false });
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

  async function handlePublishItem(item: ProjectItemListVO): Promise<void> {
    const confirmed = await confirm({
      title: "发布项目？",
      description: `发布后「${item.title}」会进入成员可见状态。`,
      confirmText: "发布",
    });
    if (!confirmed || actionLock.current) return;
    actionLock.current = true;

    try {
      await itemMutation.mutateAsync({ id: item.id, publish: true });
      if (!isCurrent()) return;
      $tip("项目已发布", "success");
    } catch {
      // Mutation 的最终失败由共享错误入口提示，保留当前草稿。
    } finally {
      actionLock.current = false;
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Workflow className="h-4 w-4 text-muted-foreground" />
            项目
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showDetailLink && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="查看项目列表"
              title="查看项目列表"
              onClick={() => void navigate(`/dashboard/planning/${projectId}/items`)}
            >
              详细
              <ChevronRight data-icon="inline-end" />
            </Button>
          )}
          {isCreator && (
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
            if (value === "IN_PROGRESS" || value === "PUBLISHED" || value === "ALL") {
              setQuery((query) => ({ ...query, status: value === "ALL" ? "" : value, page: 1 }));
            }
          }}
        >
          <TabsList variant="line" aria-label="项目状态">
            <TabsTrigger value="IN_PROGRESS">进行中</TabsTrigger>
            <TabsTrigger value="PUBLISHED">已完成</TabsTrigger>
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col rounded-xl border bg-card p-4 transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <Badge variant={getStatusVariant(item.status)}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    当前阶段：{item.currentNodeName || "尚未开始"}
                  </p>
                </div>
                {isCreator && (
                  <div className="flex shrink-0 items-center gap-1">
                    {item.status !== "PUBLISHED" &&
                      item.nodes.length > 0 &&
                      // 节点状态由后端按该节点全部任务实例汇总，全部节点完成即所有任务已完成
                      item.nodes.every((node) => node.state === "COMPLETED") && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="发布项目"
                          title="发布项目"
                          disabled={mutatingItemId === item.id}
                          onClick={() => void handlePublishItem(item)}
                        >
                          {mutatingItemId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="删除项目"
                      title="删除项目"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={mutatingItemId === item.id}
                      onClick={() => void handleDeleteItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="flex items-center gap-3">
                  <Progress value={item.progressPercent} className="h-1.5 flex-1" />
                  <span className="w-10 text-right text-xs font-medium text-muted-foreground">
                    {item.progressPercent}%
                  </span>
                </div>
                <div className="mt-3">
                  <ProjectItemNodeList nodes={item.nodes} />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-1 text-xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      void navigate(`/dashboard/planning/${projectId}/items/${item.id}`);
                    }}
                  >
                    查看任务流
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                </div>
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
