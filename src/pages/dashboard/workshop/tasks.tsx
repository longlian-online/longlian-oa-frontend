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

import { changeBaseTaskStatus, createBaseTask, getBaseTaskList } from "@/api/baseTask";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getWorkflowTaskIcon } from "@/lib/workflowVisuals";
import type { BaseTaskCreateDTO, BaseTaskVO } from "@/types/workflowTemplate";

const PAGE_SIZE = 12;
type LucideIconEntry = [string, LucideIcon];

interface BaseTaskForm {
  name: string;
  description: string;
  iconName?: string;
  metaFields: TaskMetaField[];
}

type TaskMetaFieldType = "text" | "textarea" | "file" | "number" | "select";

interface TaskMetaField {
  id: string;
  name: string;
  fieldType: TaskMetaFieldType;
  required: boolean;
  options: string[];
}

const FIELD_TYPE_LABELS: Record<TaskMetaFieldType, string> = {
  text: "单行文本",
  textarea: "多行文本",
  file: "文件上传",
  number: "数字",
  select: "下拉选择",
};

const EMPTY_FORM: BaseTaskForm = { name: "", description: "", iconName: undefined, metaFields: [] };

function BaseTaskManagementContent() {
  const [tasks, setTasks] = useState<BaseTaskVO[]>([]);
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
  const SelectedIcon = iconEntries.find(([name]) => name === form.iconName)?.[1];

  useEffect(() => {
    void loadTasks();
  }, [keyword, page]);

  async function loadTasks(): Promise<void> {
    try {
      setLoading(true);
      const data = await getBaseTaskList({
        pageNum: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        sortBy: "REF_COUNT",
        orderDir: "DESC",
      });
      setTasks(data.list);
      setTotal(data.total);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "原子任务加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function addMetaField(): void {
    setForm({
      ...form,
      metaFields: [
        ...form.metaFields,
        {
          id: `field-${Date.now()}`,
          name: "",
          fieldType: "text",
          required: false,
          options: [],
        },
      ],
    });
  }

  function updateMetaField(fieldId: string, patch: Partial<TaskMetaField>): void {
    setForm({
      ...form,
      metaFields: form.metaFields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    });
  }

  function removeMetaField(fieldId: string): void {
    setForm({ ...form, metaFields: form.metaFields.filter((field) => field.id !== fieldId) });
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

    const invalidField = form.metaFields.find((field) => !field.name.trim());
    if (invalidField) {
      $tip("请填写每个提交字段的名称", "error");
      return;
    }

    const invalidSelectField = form.metaFields.find(
      (field) => field.fieldType === "select" && field.options.length === 0,
    );
    if (invalidSelectField) {
      $tip(`请为「${invalidSelectField.name}」填写至少一个选项`, "error");
      return;
    }

    const metaSchema = form.metaFields.length
      ? JSON.stringify(
          form.metaFields.map(({ name: fieldName, fieldType, required, options }) => ({
            name: fieldName.trim(),
            fieldType,
            required,
            ...(fieldType === "select" ? { options } : {}),
          })),
        )
      : undefined;

    const payload: BaseTaskCreateDTO = {
      name,
      description: form.description.trim() || undefined,
      iconName: form.iconName,
      metaSchema,
    };

    try {
      setCreating(true);
      await createBaseTask(payload);
      $tip("原子任务已创建", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setIconPickerOpen(false);
      setIconKeyword("");
      setPage(1);
      await loadTasks();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "原子任务创建失败", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(task: BaseTaskVO): Promise<void> {
    const nextStatus = task.status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      setMutatingId(task.id);
      await changeBaseTaskStatus(task.id, nextStatus);
      $tip(nextStatus === "ENABLED" ? "原子任务已启用" : "原子任务已禁用", "success");
      await loadTasks();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "任务状态修改失败", "error");
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
            管理工作流可使用的基础节点。创建后不可编辑，只能启用或禁用。
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
              const Icon = getWorkflowTaskIcon(task.name, task.iconName);

              return (
                <article key={task.id} className="flex flex-col rounded-lg border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                        {task.iconUrl ? (
                          <img src={task.iconUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-foreground">
                          {task.name}
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mutatingId === task.id}
                      onClick={() => void handleToggleStatus(task)}
                    >
                      {mutatingId === task.id && (
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                      )}
                      {task.status === "ENABLED" ? "禁用" : "启用"}
                    </Button>
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
                  value={form.iconName || ""}
                  placeholder="输入或粘贴图标名，例如 Languages"
                  onChange={(event) =>
                    setForm({ ...form, iconName: event.target.value || undefined })
                  }
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
                    {form.iconName || "选择图标"}
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
                              const selected = form.iconName === name;
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
                                    setForm({ ...form, iconName: name });
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
                    {form.iconName && (
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => {
                          setForm({ ...form, iconName: undefined });
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
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">提交字段（可选）</span>
                <Button type="button" variant="outline" size="sm" onClick={addMetaField}>
                  <Plus data-icon="inline-start" />
                  新增字段
                </Button>
              </div>
              {form.metaFields.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  没有额外提交内容，成员可直接完成任务。
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {form.metaFields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto] sm:items-center">
                        <Input
                          value={field.name}
                          maxLength={100}
                          placeholder={`字段 ${index + 1}，例如译文链接`}
                          onChange={(event) =>
                            updateMetaField(field.id, { name: event.target.value })
                          }
                        />
                        <Select
                          value={field.fieldType}
                          onValueChange={(value: string | null) => {
                            if (!value) return;
                            updateMetaField(field.id, { fieldType: value as TaskMetaFieldType });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap px-1 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={field.required}
                            className="size-4 accent-primary"
                            onChange={(event) =>
                              updateMetaField(field.id, { required: event.target.checked })
                            }
                          />
                          必填
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`删除字段 ${index + 1}`}
                          title="删除字段"
                          onClick={() => removeMetaField(field.id)}
                        >
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      </div>
                      {field.fieldType === "select" && (
                        <Input
                          value={field.options.join("、")}
                          placeholder="填写选项，以顿号分隔，例如：通过、需修改"
                          className="mt-2"
                          onChange={(event) =>
                            updateMetaField(field.id, {
                              options: event.target.value
                                .split(/[、,，]/)
                                .map((option) => option.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
