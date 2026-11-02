import { useState } from "react";
import { Edit3, Loader2, Plus, Search, Trash2 } from "lucide-react";

import {
  createOrganizationPresetField,
  deleteOrganizationPresetField,
  updateOrganizationPresetField,
} from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageQuery } from "@/hooks/usePageQuery";
import { formatDate } from "@/lib/format";
import {
  ORGANIZATION_ADMIN_PAGE_SIZE as PAGE_SIZE,
  organizationPresetFieldsQuery,
} from "@/queries/organizationAdmin";

import type {
  OrganizationPresetFieldVO,
  OrganizationPresetFieldWriteDTO,
} from "@/types/organizationAdmin";

function OrganizationPresetFieldsContent() {
  const confirm = useConfirm();
  const [searchText, setSearchText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = usePageQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<OrganizationPresetFieldVO | null>(null);
  const [name, setName] = useState("");
  const createMutation = useApiMutation<void, [OrganizationPresetFieldWriteDTO]>({
    mutationFn: (args) => createOrganizationPresetField(...args),
    invalidate: [["presetFields"]],
  });
  const updateMutation = useApiMutation<void, [string, OrganizationPresetFieldWriteDTO]>({
    mutationFn: (args) => updateOrganizationPresetField(...args),
    invalidate: [["presetFields"]],
  });
  const deleteMutation = useApiMutation<void, [string]>({
    mutationFn: (args) => deleteOrganizationPresetField(...args),
    invalidate: [["presetFields"]],
  });
  const mutatingId =
    (createMutation.isPending ? "new" : null) ??
    (updateMutation.isPending ? String(updateMutation.variables?.[0] ?? "") : null) ??
    (deleteMutation.isPending ? String(deleteMutation.variables?.[0] ?? "") : null);
  const listQuery = useApiQuery(organizationPresetFieldsQuery(keyword, page));
  const fields = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function openCreateDialog(): void {
    setEditingField(null);
    setName("");
    setDialogOpen(true);
  }

  function openEditDialog(field: OrganizationPresetFieldVO): void {
    setEditingField(field);
    setName(field.name);
    setDialogOpen(true);
  }

  async function handleSave(): Promise<void> {
    try {
      const normalizedName = name.trim();
      if (!normalizedName) {
        $tip("请输入字段名", "error");
        return;
      }
      const payload = { name: normalizedName };
      if (editingField) {
        await updateMutation.mutateAsync([editingField.id, payload]);
        $tip("字段已更新", "success");
      } else {
        await createMutation.mutateAsync([payload]);
        $tip("字段已创建", "success");
      }
      setDialogOpen(false);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  async function handleDelete(field: OrganizationPresetFieldVO): Promise<void> {
    try {
      const confirmed = await confirm({
        title: "删除字段？",
        description: `删除后不能再选择「${field.name}」。已经加到企划里的字段不会被移除。`,
        confirmText: "删除",
        variant: "destructive",
      });
      if (!confirmed) return;
      await deleteMutation.mutateAsync([field.id]);
      $tip("字段已删除", "success");
      if (fields.length === 1 && page > 1) setPage((currentPage) => currentPage - 1);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground">表单字段</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索字段名"
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
            新增字段
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
          正在加载字段...
        </div>
      ) : fields.length === 0 ? (
        <EmptyState
          title={keyword ? "没有匹配的字段" : "暂无字段"}
          description={keyword ? "换个关键词试试。" : "新增后，成员创建企划时可以直接选用。"}
          action={
            keyword ? undefined : (
              <Button type="button" onClick={openCreateDialog}>
                <Plus className="size-4" />
                新增字段
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
                  <TableHead>字段名</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead className="w-40 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => {
                  const isMutating = mutatingId === field.id;
                  return (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium text-foreground">{field.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(field.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {field.creatorNickname?.trim() || "未设置昵称"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="编辑字段"
                            title="编辑字段"
                            disabled={isMutating}
                            onClick={() => openEditDialog(field)}
                          >
                            <Edit3 className="size-4" />
                            <span>编辑</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="删除字段"
                            title="删除字段"
                            disabled={isMutating}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void handleDelete(field)}
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
            <DialogTitle>{editingField ? "编辑字段" : "新增字段"}</DialogTitle>
            <DialogDescription>
              {editingField
                ? "修改后，之后选用该字段时会填入新的字段名。"
                : "新增一个组织成员可选用的表单字段。选择后只填入字段名，值由填写人补充。"}
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            字段名
            <Input
              value={name}
              maxLength={50}
              autoFocus
              placeholder="例如：作者、状态"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSave();
              }}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={mutatingId === (editingField?.id ?? "new")}
              onClick={() => void handleSave()}
            >
              {mutatingId === (editingField?.id ?? "new") ? (
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

export default function OrganizationPresetFieldsPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationPresetFieldsContent />
    </OrganizationAdminGuard>
  );
}
