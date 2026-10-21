import { useState } from "react";
import { CheckCircle2, Edit3, Loader2, Plus, Search, Trash2, XCircle } from "lucide-react";

import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { usePageQuery } from "@/hooks/usePageQuery";
import {
  changeProjectTypeStatus,
  createOrganizationProjectType,
  deleteOrganizationProjectType,
  updateOrganizationProjectType,
} from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDate } from "@/lib/format";

import {
  ORGANIZATION_ADMIN_PAGE_SIZE as PAGE_SIZE,
  organizationProjectTypesQuery,
} from "@/queries/organizationAdmin";
import type { OrganizationResourceStatus, ProjectTypeVO } from "@/types/organizationAdmin";

function OrganizationProjectTypesContent() {
  const confirm = useConfirm();
  const changeProjectTypeStatusMutation = useApiMutation<
    Awaited<ReturnType<typeof changeProjectTypeStatus>>,
    Parameters<typeof changeProjectTypeStatus>
  >({
    mutationFn: (args) => changeProjectTypeStatus(...args),
    invalidate: [["projectTypes"], ["projects"], ["workshop"], ["plaza"]],
  });
  const createOrganizationProjectTypeMutation = useApiMutation<
    Awaited<ReturnType<typeof createOrganizationProjectType>>,
    Parameters<typeof createOrganizationProjectType>
  >({
    mutationFn: (args) => createOrganizationProjectType(...args),
    invalidate: [["projectTypes"], ["projects"], ["workshop"], ["plaza"]],
  });
  const deleteOrganizationProjectTypeMutation = useApiMutation<
    Awaited<ReturnType<typeof deleteOrganizationProjectType>>,
    Parameters<typeof deleteOrganizationProjectType>
  >({
    mutationFn: (args) => deleteOrganizationProjectType(...args),
    invalidate: [["projectTypes"], ["projects"], ["workshop"], ["plaza"]],
  });
  const updateOrganizationProjectTypeMutation = useApiMutation<
    Awaited<ReturnType<typeof updateOrganizationProjectType>>,
    Parameters<typeof updateOrganizationProjectType>
  >({
    mutationFn: (args) => updateOrganizationProjectType(...args),
    invalidate: [["projectTypes"], ["projects"], ["workshop"], ["plaza"]],
  });
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = usePageQuery();
  const mutatingId =
    (changeProjectTypeStatusMutation.isPending
      ? String(changeProjectTypeStatusMutation.variables?.[0] ?? "new")
      : null) ??
    (createOrganizationProjectTypeMutation.isPending ? "new" : null) ??
    (deleteOrganizationProjectTypeMutation.isPending
      ? String(deleteOrganizationProjectTypeMutation.variables?.[0] ?? "new")
      : null) ??
    (updateOrganizationProjectTypeMutation.isPending
      ? String(updateOrganizationProjectTypeMutation.variables?.[0] ?? "new")
      : null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProjectTypeVO | null>(null);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("0");

  const listQuery = useApiQuery(organizationProjectTypesQuery(keyword, page));
  const types = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function openCreateDialog(): void {
    setEditingType(null);
    setName("");
    setPriority("0");
    setDialogOpen(true);
  }

  function openEditDialog(type: ProjectTypeVO): void {
    setEditingType(type);
    setName(type.name);
    setPriority(String(type.priority));
    setDialogOpen(true);
  }

  async function handleSaveType(): Promise<void> {
    try {
      const normalizedName = name.trim();
      if (!normalizedName) {
        $tip("请输入企划类型名称", "error");
        return;
      }
      const normalizedPriority = Number(priority);
      if (
        !priority.trim() ||
        !Number.isInteger(normalizedPriority) ||
        normalizedPriority < -2147483648 ||
        normalizedPriority > 2147483647
      ) {
        $tip("优先级必须为 32 位整数", "error");
        return;
      }

      if (editingType) {
        await updateOrganizationProjectTypeMutation.mutateAsync([
          editingType.id,
          {
            name: normalizedName,
            priority: normalizedPriority,
          },
        ]);
        $tip("企划类型已更新", "success");
      } else {
        await createOrganizationProjectTypeMutation.mutateAsync([
          { name: normalizedName, priority: normalizedPriority },
        ]);
        $tip("企划类型已创建", "success");
      }
      setDialogOpen(false);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  async function handleDelete(type: ProjectTypeVO): Promise<void> {
    try {
      const confirmed = await confirm({
        title: "删除企划类型？",
        description: `删除后「${type.name}」将无法恢复，仅未被企划引用的类型可以删除。`,
        confirmText: "删除",
        variant: "destructive",
      });
      if (!confirmed) return;

      await deleteOrganizationProjectTypeMutation.mutateAsync([type.id]);
      $tip("企划类型已删除", "success");
      if (types.length === 1 && page > 1) setPage((currentPage) => currentPage - 1);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  async function handleToggleStatus(type: ProjectTypeVO): Promise<void> {
    try {
      const nextStatus: OrganizationResourceStatus =
        type.status === "ENABLED" ? "DISABLED" : "ENABLED";
      await changeProjectTypeStatusMutation.mutateAsync([type.id, nextStatus]);
      $tip(nextStatus === "ENABLED" ? "企划类型已启用" : "企划类型已禁用", "success");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">企划类型</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索类型"
              className="pl-9"
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleSearch}>
            搜索
          </Button>
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="size-4" />
            新增类型
          </Button>
        </div>
      </div>

      {listQuery.isError && !listQuery.data ? (
        <Button variant="outline" onClick={() => void listQuery.refetch()}>
          加载失败，重试
        </Button>
      ) : loading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          正在加载企划类型...
        </div>
      ) : types.length === 0 ? (
        <EmptyState
          title={keyword ? "没有匹配的企划类型" : "暂无企划类型"}
          description={keyword ? "换个关键词试试。" : "新增类型后，组织成员即可用于创建企划。"}
          action={
            keyword ? undefined : (
              <Button type="button" onClick={openCreateDialog}>
                <Plus className="size-4" />
                新增类型
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型名称</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-40 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => {
                  const disabled = type.status === "DISABLED";
                  const isMutating = mutatingId === type.id;
                  const referenced = type.refCount > 0;
                  return (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium text-foreground">{type.name}</TableCell>
                      <TableCell>{type.priority}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {type.creatorNickname || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(type.createdAt, false)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={disabled ? "secondary" : "outline"}>
                          {disabled ? "已禁用" : "已启用"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="编辑企划类型"
                            title="编辑企划类型"
                            disabled={isMutating}
                            onClick={() => openEditDialog(type)}
                          >
                            <Edit3 className="size-4" />
                            <span>编辑</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={disabled ? "启用企划类型" : "禁用企划类型"}
                            title={disabled ? "启用企划类型" : "禁用企划类型"}
                            disabled={isMutating}
                            className={
                              disabled
                                ? "text-muted-foreground"
                                : "text-destructive hover:bg-destructive/10 hover:text-destructive"
                            }
                            onClick={() => void handleToggleStatus(type)}
                          >
                            {disabled ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <XCircle className="size-4 text-destructive" />
                            )}
                            <span>{disabled ? "启用" : "禁用"}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="删除企划类型"
                            title={
                              referenced
                                ? `有 ${type.refCount} 个企划在用，不能删除，请改为禁用`
                                : "删除企划类型"
                            }
                            disabled={isMutating || referenced}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void handleDelete(type)}
                          >
                            {isMutating ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            <span>删除</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? "编辑企划类型" : "新增企划类型"}</DialogTitle>
            <DialogDescription>
              {editingType ? "修改类型名称与优先级。" : "新增一个组织可用的企划类型。"}
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            类型名称
            <Input
              value={name}
              maxLength={50}
              autoFocus
              placeholder="例如：漫画、小说、视频"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSaveType();
              }}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            优先级
            <Input
              type="number"
              step={1}
              min={-2147483648}
              max={2147483647}
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSaveType();
              }}
            />
            <span className="text-xs font-normal text-muted-foreground">
              仅影响用户端企划类型的展示顺序，数值越大越靠前，默认 0。
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={mutatingId === (editingType?.id ?? "new")}
              onClick={() => void handleSaveType()}
            >
              {mutatingId === (editingType?.id ?? "new") ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizationProjectTypesPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationProjectTypesContent />
    </OrganizationAdminGuard>
  );
}
