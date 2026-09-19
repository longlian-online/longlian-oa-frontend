import { useEffect, useState } from "react";
import { CheckCircle2, Edit3, Loader2, Plus, Search, Trash2, XCircle } from "lucide-react";

import {
  changeProjectTypeStatus,
  createOrganizationProjectType,
  deleteOrganizationProjectType,
  getOrganizationProjectTypes,
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
import type { OrganizationResourceStatus, ProjectTypeVO } from "@/types/organizationAdmin";

const PAGE_SIZE = 10;

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("zh-CN");
}

function OrganizationProjectTypesContent() {
  const confirm = useConfirm();
  const [types, setTypes] = useState<ProjectTypeVO[]>([]);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProjectTypeVO | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    void loadTypes();
  }, [keyword, page]);

  async function loadTypes(): Promise<void> {
    try {
      setLoading(true);
      const result = await getOrganizationProjectTypes({
        keyword: keyword || undefined,
        pageNum: page,
        pageSize: PAGE_SIZE,
        orderDir: "DESC",
      });
      setTypes(result.list);
      setTotal(result.total);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "企划类型加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function openCreateDialog(): void {
    setEditingType(null);
    setName("");
    setDialogOpen(true);
  }

  function openEditDialog(type: ProjectTypeVO): void {
    setEditingType(type);
    setName(type.name);
    setDialogOpen(true);
  }

  async function handleSaveType(): Promise<void> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      $tip("请输入企划类型名称", "error");
      return;
    }

    try {
      setMutatingId(editingType?.id ?? "new");
      if (editingType) {
        await updateOrganizationProjectType(editingType.id, { name: normalizedName });
        $tip("企划类型已重命名", "success");
      } else {
        await createOrganizationProjectType({ name: normalizedName });
        $tip("企划类型已创建", "success");
      }
      setDialogOpen(false);
      await loadTypes();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "企划类型保存失败", "error");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleDelete(type: ProjectTypeVO): Promise<void> {
    const confirmed = await confirm({
      title: "删除企划类型？",
      description: `删除后「${type.name}」将无法恢复，仅未被企划引用的类型可以删除。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      setMutatingId(type.id);
      await deleteOrganizationProjectType(type.id);
      $tip("企划类型已删除", "success");
      if (types.length === 1 && page > 1) setPage((currentPage) => currentPage - 1);
      await loadTypes();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "企划类型删除失败", "error");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleToggleStatus(type: ProjectTypeVO): Promise<void> {
    const nextStatus: OrganizationResourceStatus =
      type.status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      setMutatingId(type.id);
      await changeProjectTypeStatus(type.id, nextStatus);
      $tip(nextStatus === "ENABLED" ? "企划类型已启用" : "企划类型已禁用", "success");
      await loadTypes();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "企划类型状态更新失败", "error");
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">企划类型</h1>
          <p className="mt-1 text-sm text-muted-foreground">维护组织内可用的企划类型。</p>
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

      {loading ? (
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
                  return (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium text-foreground">{type.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {type.creatorNickname || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(type.createdAt)}
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
                            aria-label="重命名企划类型"
                            title="重命名企划类型"
                            disabled={isMutating}
                            onClick={() => openEditDialog(type)}
                          >
                            <Edit3 className="size-4" />
                            <span>重命名</span>
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
                            title="删除企划类型"
                            disabled={isMutating}
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
            <DialogTitle>{editingType ? "重命名企划类型" : "新增企划类型"}</DialogTitle>
            <DialogDescription>
              {editingType ? "修改类型名称后会立即在组织内生效。" : "新增一个组织可用的企划类型。"}
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
