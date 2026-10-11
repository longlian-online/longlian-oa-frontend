import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

import {
  changeBaseTaskStatus,
  createOrganizationBaseTask,
  deleteOrganizationBaseTask,
  getOrganizationBaseTaskList,
} from "@/api/organizationAdmin";
import BaseTaskFieldsEditor from "@/components/BaseTaskFieldsEditor";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PageLoading from "@/components/PageLoading";
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
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import { getWorkflowTaskIcon } from "@/lib/workflowVisuals";
import type {
  OrganizationBaseTaskCreateDTO,
  OrganizationBaseTaskVO,
} from "@/types/organizationAdmin";
import type { TaskFormField } from "@/types/task";

const PAGE_SIZE = 12;
type LucideIconEntry = [string, LucideIcon];

interface BaseTaskForm {
  name: string;
  description: string;
  icon?: string;
  submitFields: TaskFormField[];
}

const EMPTY_FORM: BaseTaskForm = {
  name: "",
  description: "",
  icon: undefined,
  submitFields: [],
};

function BaseTaskManagementContent() {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<OrganizationBaseTaskVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [form, setForm] = useState<BaseTaskForm>(EMPTY_FORM);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconKeyword, setIconKeyword] = useState("");
  const [iconEntries, setIconEntries] = useState<LucideIconEntry[]>([]);
  const [loadingIcons, setLoadingIcons] = useState(false);
  const filteredIcons = useMemo(() => {
    const query = iconKeyword.trim().toLowerCase();
    return query ? iconEntries.filter(([name]) => name.toLowerCase().includes(query)) : iconEntries;
  }, [iconEntries, iconKeyword]);
  const SelectedIcon = iconEntries.find(([name]) => name === form.icon)?.[1];

  useEffect(() => {
    void loadTasks();
  }, [keyword, page]);

  async function loadTasks(): Promise<void> {
    try {
      setLoading(true);
      const data = await getOrganizationBaseTaskList({
        pageNum: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        sortBy: "REF_COUNT",
        orderDir: "DESC",
      });
      setTasks(data.list);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function addSubmitField(): void {
    setForm({
      ...form,
      submitFields: [
        ...form.submitFields,
        {
          key: `field-${crypto.randomUUID()}`,
          label: "",
          type: "text",
          required: false,
          options: [],
        },
      ],
    });
  }

  function updateSubmitField(fieldKey: string, patch: Partial<TaskFormField>): void {
    setForm({
      ...form,
      submitFields: form.submitFields.map((field) =>
        field.key === fieldKey ? { ...field, ...patch } : field,
      ),
    });
  }

  function removeSubmitField(fieldKey: string): void {
    setForm({ ...form, submitFields: form.submitFields.filter((field) => field.key !== fieldKey) });
  }

  async function handleIconPickerToggle(): Promise<void> {
    if (iconPickerOpen) {
      setIconPickerOpen(false);
      return;
    }

    setIconPickerOpen(true);
    if (iconEntries.length > 0 || loadingIcons) return;

    try {
      setLoadingIcons(true);
      const { icons } = await import("lucide-react");
      setIconEntries(
        (Object.entries(icons) as LucideIconEntry[]).sort(([prevName], [nextName]) =>
          prevName.localeCompare(nextName),
        ),
      );
    } finally {
      setLoadingIcons(false);
    }
  }

  async function handleCreate(): Promise<void> {
    const name = form.name.trim();
    if (!name) {
      $tip("请输入任务名称", "error");
      return;
    }

    const invalidField = form.submitFields.find((field) => !field.label.trim());
    if (invalidField) {
      $tip("请填写每个提交字段的名称", "error");
      return;
    }

    const invalidSelectField = form.submitFields.find((field) => {
      if (field.type !== "select") return false;
      return field.options.every((option) => option.trim() === "");
    });
    if (invalidSelectField) {
      $tip(`请为「${invalidSelectField.label}」填写至少一个选项`, "error");
      return;
    }

    const payload: OrganizationBaseTaskCreateDTO = {
      name,
      description: form.description.trim() || undefined,
      icon: form.icon,
      submitFields: form.submitFields.map((field) => ({
        ...field,
        label: field.label.trim(),
        options:
          field.type === "select"
            ? [...new Set(field.options.map((option) => option.trim()).filter(Boolean))]
            : [],
      })),
    };

    try {
      setCreating(true);
      await createOrganizationBaseTask(payload);
      $tip("原子任务已创建", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setIconPickerOpen(false);
      setIconKeyword("");
      setPage(1);
      await loadTasks();
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(task: OrganizationBaseTaskVO): Promise<void> {
    const nextStatus = task.status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      setMutatingId(task.id);
      await changeBaseTaskStatus(task.id, nextStatus);
      $tip(nextStatus === "ENABLED" ? "原子任务已启用" : "原子任务已禁用", "success");
      await loadTasks();
    } finally {
      setMutatingId(null);
    }
  }

  async function handleDelete(task: OrganizationBaseTaskVO): Promise<void> {
    const taskName = task.name ?? "未命名任务";
    const confirmed = await confirm({
      title: "删除原子任务？",
      description: `删除后「${taskName}」将不可恢复。已被任务模板或项目任务节点引用的任务不能删除，请改为禁用。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      setMutatingId(task.id);
      await deleteOrganizationBaseTask(task.id);
      $tip("原子任务已删除", "success");
      if (tasks.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadTasks();
      }
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">原子任务</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理工作流可使用的基础节点。创建后不可编辑；未被引用的任务可以删除，已被引用的任务请禁用。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索原子任务"
              className="pl-9"
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            创建任务
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoading message="正在加载原子任务..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<Workflow className="size-5 text-muted-foreground" />}
          title="暂无原子任务"
          description="先创建翻译、审核、嵌字等任务，再去编排工作流。"
          action={<Button onClick={() => setCreateOpen(true)}>创建第一个任务</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => {
              const taskName = task.name ?? "未命名任务";
              const Icon = getWorkflowTaskIcon(taskName, task.icon);

              return (
                <article key={task.id} className="flex flex-col rounded-lg border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-foreground">
                          {taskName}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {task.description || "暂无任务说明"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={task.status === "ENABLED" ? "default" : "secondary"}>
                      {task.status === "ENABLED" ? "已启用" : "已禁用"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2.5">
                    <div className="text-xs text-muted-foreground">
                      已被 {task.refCount} 个模板引用
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={
                          task.status === "ENABLED"
                            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                            : "text-muted-foreground"
                        }
                        disabled={mutatingId === task.id}
                        onClick={() => void handleToggleStatus(task)}
                      >
                        {mutatingId === task.id && (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        )}
                        {task.status === "ENABLED" ? "禁用" : "启用"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`删除${taskName}`}
                        title={
                          task.refCount > 0
                            ? "该任务已被任务模板或项目任务节点引用，请改为禁用"
                            : "删除原子任务"
                        }
                        disabled={mutatingId === task.id || task.refCount > 0}
                        onClick={() => void handleDelete(task)}
                      >
                        {mutatingId === task.id ? (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <Trash2 data-icon="inline-start" />
                        )}
                        删除
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建原子任务</DialogTitle>
            <DialogDescription>
              创建后名称、说明和字段定义不可修改，请确认无误后提交。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              任务名称
              <Input
                value={form.name}
                maxLength={100}
                placeholder="例如：翻译、审核、嵌字"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              任务说明
              <Textarea
                value={form.description}
                maxLength={500}
                placeholder="说明成员需要完成的工作"
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">节点图标</span>
              <div className="flex gap-2">
                <Input
                  value={form.icon || ""}
                  placeholder="输入或粘贴图标名，例如 Languages"
                  onChange={(event) => setForm({ ...form, icon: event.target.value || undefined })}
                />
                <a
                  href="https://lucide.dev/icons"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
                >
                  图标库
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={iconPickerOpen}
                  aria-haspopup="listbox"
                  className="flex h-10 w-full items-center gap-2 rounded-lg border bg-background px-3 text-sm transition-colors hover:border-primary/45"
                  onClick={() => void handleIconPickerToggle()}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center text-primary">
                    {SelectedIcon ? (
                      <SelectedIcon className="size-4" />
                    ) : (
                      <Workflow className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left text-foreground">
                    {form.icon || "选择图标"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      iconPickerOpen && "rotate-180",
                    )}
                  />
                </button>
                {iconPickerOpen && (
                  <div className="absolute inset-x-0 z-50 mt-2 rounded-xl border bg-popover p-3 shadow-lg">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        value={iconKeyword}
                        placeholder="搜索图标名，例如 Languages"
                        className="h-9 pl-9"
                        onChange={(event) => setIconKeyword(event.target.value)}
                      />
                    </div>
                    <div className="mt-3 max-h-64 overflow-y-auto pr-1" role="listbox">
                      {loadingIcons ? (
                        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          正在加载图标库
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
                            {filteredIcons.map(([name, Icon]) => {
                              const selected = form.icon === name;
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  title={name}
                                  className={cn(
                                    "flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/5 hover:text-primary",
                                    selected && "border-primary bg-primary/10 text-primary",
                                  )}
                                  onClick={() => {
                                    setForm({ ...form, icon: name });
                                    setIconPickerOpen(false);
                                    setIconKeyword("");
                                  }}
                                >
                                  <Icon className="size-4" />
                                  <span className="sr-only">{name}</span>
                                </button>
                              );
                            })}
                          </div>
                          {filteredIcons.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                              没有匹配的图标
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {form.icon && (
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => {
                          setForm({ ...form, icon: undefined });
                          setIconPickerOpen(false);
                          setIconKeyword("");
                        }}
                      >
                        <X className="size-3.5" />
                        使用自动匹配
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className="text-xs font-normal text-muted-foreground">
                支持全部 Lucide 图标；未填写时按任务名称自动匹配。
              </span>
            </div>
            <BaseTaskFieldsEditor
              fields={form.submitFields}
              onAdd={addSubmitField}
              onChange={updateSubmitField}
              onRemove={removeSubmitField}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button disabled={creating || !form.name.trim()} onClick={() => void handleCreate()}>
              {creating && <Loader2 data-icon="inline-start" className="animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BaseTaskManagementPage() {
  return (
    <OrganizationAdminGuard>
      <BaseTaskManagementContent />
    </OrganizationAdminGuard>
  );
}
