import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Layers2, Loader2, Plus, Trash2 } from "lucide-react";

import {
  createWorkshopTaskTemplate,
  getBaseTaskList,
  updateWorkshopTaskTemplate,
} from "@/api/workflowTemplate";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  BaseTaskVO,
  WorkshopTaskTemplateCreateDTO,
  WorkshopTaskTemplateNodeCreateDTO,
  WorkshopTaskTemplateNodeVO,
  WorkshopTaskTemplateVO,
} from "@/types/workflowTemplate";

interface CreateWorkflowLocationState {
  template?: WorkshopTaskTemplateVO;
}

interface WorkflowForm {
  name: string;
  description: string;
}

interface EditorNode {
  localId: string;
  baseTaskId: string;
  customName: string;
  sort: number;
  parallelSort: number;
}

function getNodeLabel(node: EditorNode, baseTasks: BaseTaskVO[]): string {
  const baseTask = baseTasks.find((task) => String(task.id) === node.baseTaskId);
  return node.customName || baseTask?.name || "未命名任务";
}

function buildEditorNodes(nodes?: WorkshopTaskTemplateNodeVO[]): EditorNode[] {
  if (!nodes) return [];

  return [...nodes]
    .sort((prev, next) => {
      if (prev.sort !== next.sort) return prev.sort - next.sort;
      return (prev.parallelSort ?? 1) - (next.parallelSort ?? 1);
    })
    .map((node, index) => ({
      localId: `${node.baseTaskId}-${node.sort}-${node.parallelSort ?? 1}-${index}`,
      baseTaskId: String(node.baseTaskId),
      customName: node.customName || node.baseTaskName || "",
      sort: node.sort,
      parallelSort: node.parallelSort ?? 1,
    }));
}

function normalizeNodes(nodes: EditorNode[]): EditorNode[] {
  const sortValues = Array.from(new Set(nodes.map((node) => node.sort))).sort(
    (prev, next) => prev - next,
  );
  const sortMap = new Map<number, number>();
  sortValues.forEach((sortValue, index) => {
    sortMap.set(sortValue, index + 1);
  });

  const sortedNodes = [...nodes]
    .sort((prev, next) => {
      if (prev.sort !== next.sort) return prev.sort - next.sort;
      return prev.parallelSort - next.parallelSort;
    })
    .map((node) => ({
      ...node,
      sort: sortMap.get(node.sort) ?? 1,
    }));

  return sortedNodes.map((node) => {
    const sameSortNodes = sortedNodes.filter((item) => item.sort === node.sort);
    const parallelIndex = sameSortNodes.findIndex((item) => item.localId === node.localId);
    return {
      ...node,
      parallelSort: parallelIndex + 1,
    };
  });
}

function toCreateNodes(nodes: EditorNode[]): WorkshopTaskTemplateNodeCreateDTO[] {
  return normalizeNodes(nodes).map((node) => ({
    baseTaskId: node.baseTaskId,
    customName: node.customName.trim() || undefined,
    sort: node.sort,
    parallelSort: node.parallelSort,
  }));
}

function groupNodes(nodes: EditorNode[]): EditorNode[][] {
  const grouped = new Map<number, EditorNode[]>();
  normalizeNodes(nodes).forEach((node) => {
    const group = grouped.get(node.sort) ?? [];
    group.push(node);
    grouped.set(node.sort, group);
  });

  return Array.from(grouped.entries())
    .sort(([prevSort], [nextSort]) => prevSort - nextSort)
    .map(([, group]) => group.sort((prev, next) => prev.parallelSort - next.parallelSort));
}

function WorkflowNodeCard({
  node,
  baseTasks,
  onRename,
  onRemove,
}: {
  node: EditorNode;
  baseTasks: BaseTaskVO[];
  onRename: (localId: string, customName: string) => void;
  onRemove: (localId: string) => void;
}) {
  return (
    <div className="w-40 rounded-xl border bg-background p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 text-sm font-semibold text-foreground">
          <div className="truncate">{getNodeLabel(node, baseTasks)}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="删除节点"
          onClick={() => onRemove(node.localId)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Input
        value={node.customName}
        placeholder="自定义名称"
        className="h-7 text-xs"
        onChange={(event) => onRename(node.localId, event.target.value)}
      />
    </div>
  );
}

export default function CreateWorkflowPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CreateWorkflowLocationState | null;
  const editingTemplate = state?.template;
  const isEditing = Boolean(editingTemplate);
  const [activeTab, setActiveTab] = useState<"info" | "tasks">("info");
  const [formData, setFormData] = useState<WorkflowForm>({
    name: editingTemplate?.name ?? "",
    description: editingTemplate?.description ?? "",
  });
  const [baseTasks, setBaseTasks] = useState<BaseTaskVO[]>([]);
  const [nodes, setNodes] = useState<EditorNode[]>(() => buildEditorNodes(editingTemplate?.nodes));
  const [selectedBaseTaskId, setSelectedBaseTaskId] = useState("");
  const [loadingBaseTasks, setLoadingBaseTasks] = useState(true);
  const [saving, setSaving] = useState(false);

  const groupedNodes = useMemo(() => groupNodes(nodes), [nodes]);
  const canSave = Boolean(formData.name.trim() && nodes.length > 0 && !saving);

  useEffect(() => {
    void loadBaseTasks();
  }, []);

  async function loadBaseTasks(): Promise<void> {
    try {
      setLoadingBaseTasks(true);
      const data = await getBaseTaskList({
        pageNum: 1,
        pageSize: 100,
        status: "ENABLED",
        sortBy: "refCount",
        orderDir: "DESC",
      });
      setBaseTasks(data.list);
      if (data.list.length > 0) {
        setSelectedBaseTaskId(String(data.list[0].id));
      }
    } catch (error) {
      $tip(error instanceof Error ? error.message : "原子任务加载失败", "error");
    } finally {
      setLoadingBaseTasks(false);
    }
  }

  function handleAddNode(): void {
    if (!selectedBaseTaskId) return;

    const baseTask = baseTasks.find((task) => String(task.id) === selectedBaseTaskId);
    const nextSort = nodes.length > 0 ? Math.max(...nodes.map((node) => node.sort)) + 1 : 1;
    setNodes(
      normalizeNodes([
        ...nodes,
        {
          localId: `${selectedBaseTaskId}-${Date.now()}`,
          baseTaskId: selectedBaseTaskId,
          customName: baseTask?.name ?? "",
          sort: nextSort,
          parallelSort: 1,
        },
      ]),
    );
  }

  function handleRenameNode(localId: string, customName: string): void {
    setNodes(nodes.map((node) => (node.localId === localId ? { ...node, customName } : node)));
  }

  function handleRemoveNode(localId: string): void {
    setNodes(normalizeNodes(nodes.filter((node) => node.localId !== localId)));
  }

  function handleMakeParallel(localId: string): void {
    const normalizedNodes = normalizeNodes(nodes);
    const nodeIndex = normalizedNodes.findIndex((node) => node.localId === localId);
    if (nodeIndex <= 0) return;

    const previousNode = normalizedNodes[nodeIndex - 1];
    setNodes(
      normalizeNodes(
        normalizedNodes.map((node) =>
          node.localId === localId ? { ...node, sort: previousNode.sort } : node,
        ),
      ),
    );
  }

  function handleSplitStage(localId: string): void {
    const normalizedNodes = normalizeNodes(nodes);
    const nodeIndex = normalizedNodes.findIndex((node) => node.localId === localId);
    if (nodeIndex < 0) return;

    setNodes(
      normalizeNodes(
        normalizedNodes.map((node, index) =>
          node.localId === localId ? { ...node, sort: index + 1 } : node,
        ),
      ),
    );
  }

  async function handleSave(): Promise<void> {
    if (!formData.name.trim()) {
      $tip("请输入流程名", "error");
      return;
    }

    if (nodes.length === 0) {
      $tip("请至少添加一个任务节点", "error");
      return;
    }

    const payload: WorkshopTaskTemplateCreateDTO = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      nodes: toCreateNodes(nodes),
    };

    try {
      setSaving(true);
      if (editingTemplate) {
        await updateWorkshopTaskTemplate(String(editingTemplate.id), payload);
        $tip("流程模板已更新", "success");
      } else {
        await createWorkshopTaskTemplate(payload);
        $tip("流程模板已创建", "success");
      }
      void navigate("/dashboard/workshop/workflows");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "流程模板保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-m-6 flex min-h-[calc(100svh-3.5rem)] flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="返回"
          onClick={() => navigate("/dashboard/workshop/workflows")}
          className="text-muted-foreground"
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-bold leading-6 text-foreground">
          {isEditing ? "编辑工作流程" : "创建工作流程"}
        </h1>
        <div className="flex-1" />
        <Button type="button" disabled={!canSave} className="h-9 px-4" onClick={handleSave}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditing ? "更新" : "创建"}
        </Button>
      </div>

      <div className="flex flex-1 items-start gap-4 overflow-hidden p-4">
        <section className="flex h-[calc(100svh-8.5rem)] min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Layers2 className="h-4 w-4 text-muted-foreground" />
              节点编排
            </div>
            <div className="text-xs text-muted-foreground">sort 表示阶段，相同 sort 为并行组</div>
          </div>

          <div className="flex flex-1 items-center overflow-auto p-6">
            {groupedNodes.length === 0 ? (
              <div className="flex w-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <Layers2 className="mb-3 h-8 w-8" />
                从右侧任务库添加节点
              </div>
            ) : (
              <div className="flex min-w-max items-center gap-5">
                {groupedNodes.map((group, groupIndex) => (
                  <div key={group[0].sort} className="flex items-center gap-5">
                    <div className="flex flex-col gap-3">
                      {group.map((node) => (
                        <WorkflowNodeCard
                          key={node.localId}
                          node={node}
                          baseTasks={baseTasks}
                          onRename={handleRenameNode}
                          onRemove={handleRemoveNode}
                        />
                      ))}
                    </div>
                    {groupIndex < groupedNodes.length - 1 && (
                      <div className="h-0.5 w-10 bg-foreground" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="flex h-[calc(100svh-8.5rem)] min-h-[420px] w-[320px] shrink-0 flex-col rounded-xl border bg-card px-5 py-4">
          <div className="flex h-7 justify-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={cn(
                "cursor-pointer border-b text-sm leading-6",
                activeTab === "info"
                  ? "border-foreground font-bold text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              信息
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={cn(
                "cursor-pointer border-b text-sm leading-6",
                activeTab === "tasks"
                  ? "border-foreground font-bold text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              任务
            </button>
          </div>

          {activeTab === "info" ? (
            <div className="mt-5 flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm text-foreground">
                流程名
                <Input
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  placeholder="请输入流程名"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-foreground">
                简介
                <Textarea
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({ ...formData, description: event.target.value })
                  }
                  placeholder="描述流程适用场景"
                  className="min-h-24 resize-none"
                />
              </label>
            </div>
          ) : (
            <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">原子任务</label>
                {baseTasks.length > 0 ? (
                  <Select
                    value={selectedBaseTaskId}
                    onValueChange={(value: string | null) => setSelectedBaseTaskId(value || "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingBaseTasks ? "正在加载任务" : "选择任务"} />
                    </SelectTrigger>
                    <SelectContent>
                      {baseTasks.map((task) => (
                        <SelectItem key={task.id} value={String(task.id)}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={selectedBaseTaskId}
                    disabled={loadingBaseTasks}
                    placeholder="输入原子任务 ID"
                    onChange={(event) => setSelectedBaseTaskId(event.target.value)}
                  />
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-9 justify-start gap-2"
                disabled={!selectedBaseTaskId}
                onClick={handleAddNode}
              >
                <Plus data-icon="inline-start" />
                添加任务
              </Button>

              <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-secondary/60 p-3">
                {loadingBaseTasks ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在加载
                  </div>
                ) : nodes.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    还没有节点。选择一个原子任务后点击添加。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {normalizeNodes(nodes).map((node) => (
                      <div key={node.localId} className="rounded-lg bg-background p-2">
                        <div className="truncate text-sm font-medium text-foreground">
                          {getNodeLabel(node, baseTasks)}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleMakeParallel(node.localId)}
                          >
                            并入上组
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleSplitStage(node.localId)}
                          >
                            独立
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
