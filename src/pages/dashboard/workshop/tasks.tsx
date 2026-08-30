import { useEffect, useState } from "react";
import { Loader2, Plus, Search, Workflow } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import type { BaseTaskCreateDTO, BaseTaskVO } from "@/types/workflowTemplate";

const PAGE_SIZE = 12;

interface BaseTaskForm {
  name: string;
  description: string;
  metaSchema: string;
}

const EMPTY_FORM: BaseTaskForm = { name: "", description: "", metaSchema: "" };

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

  async function handleCreate(): Promise<void> {
    const name = form.name.trim();
    if (!name) {
      $tip("请输入任务名称", "error");
      return;
    }

    const metaSchema = form.metaSchema.trim();
    if (metaSchema) {
      try {
        const parsed = JSON.parse(metaSchema) as unknown;
        if (!Array.isArray(parsed)) throw new Error("元数据定义必须是数组");
      } catch {
        $tip("元数据定义必须是合法的 JSON 数组", "error");
        return;
      }
    }

    const payload: BaseTaskCreateDTO = {
      name,
      description: form.description.trim() || undefined,
      metaSchema: metaSchema || undefined,
    };

    try {
      setCreating(true);
      await createBaseTask(payload);
      $tip("原子任务已创建", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
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
            {tasks.map((task) => (
              <article
                key={task.id}
                className="flex min-h-40 flex-col rounded-2xl border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-foreground">{task.name}</h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {task.description || "暂无任务说明"}
                    </p>
                  </div>
                  <Badge variant={task.status === "ENABLED" ? "default" : "secondary"}>
                    {task.status === "ENABLED" ? "已启用" : "已禁用"}
                  </Badge>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
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
            ))}
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
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              提交字段定义（可选）
              <Textarea
                value={form.metaSchema}
                placeholder={'例如：[{"name":"附件","fieldType":"file","required":true}]'}
                className="min-h-28 font-mono text-xs"
                onChange={(event) => setForm({ ...form, metaSchema: event.target.value })}
              />
              <span className="text-xs font-normal text-muted-foreground">
                使用 JSON 数组定义提交时需要填写的字段。
              </span>
            </label>
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
