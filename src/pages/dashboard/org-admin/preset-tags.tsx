import { useState } from "react";
import { Edit3, Loader2, Plus, Search, Trash2 } from "lucide-react";

import {
  createOrganizationPresetTag,
  deleteOrganizationPresetTag,
  updateOrganizationPresetTag,
} from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import ProjectMetadataTag, {
  PROJECT_METADATA_TAG_COLOR_LABELS,
} from "@/components/ProjectMetadataTag";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  PROJECT_METADATA_TAG_COLORS,
  normalizeProjectMetadataTagColor,
} from "@/lib/projectMetadata";
import {
  ORGANIZATION_ADMIN_PAGE_SIZE as PAGE_SIZE,
  organizationPresetTagsQuery,
} from "@/queries/organizationAdmin";

import type {
  OrganizationPresetTagVO,
  OrganizationPresetTagWriteDTO,
} from "@/types/organizationAdmin";
import type { ProjectMetadataTagColor } from "@/lib/projectMetadata";

function OrganizationPresetTagsContent() {
  const confirm = useConfirm();
  const [searchText, setSearchText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = usePageQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<OrganizationPresetTagVO | null>(null);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("0");
  const [color, setColor] = useState<ProjectMetadataTagColor | undefined>();
  const createMutation = useApiMutation<void, [OrganizationPresetTagWriteDTO]>({
    mutationFn: (args) => createOrganizationPresetTag(...args),
    invalidate: [["presetTags"]],
  });
  const updateMutation = useApiMutation<void, [string, OrganizationPresetTagWriteDTO]>({
    mutationFn: (args) => updateOrganizationPresetTag(...args),
    invalidate: [["presetTags"]],
  });
  const deleteMutation = useApiMutation<void, [string]>({
    mutationFn: (args) => deleteOrganizationPresetTag(...args),
    invalidate: [["presetTags"]],
  });
  const mutatingId =
    (createMutation.isPending ? "new" : null) ??
    (updateMutation.isPending ? String(updateMutation.variables?.[0] ?? "") : null) ??
    (deleteMutation.isPending ? String(deleteMutation.variables?.[0] ?? "") : null);
  const listQuery = useApiQuery(organizationPresetTagsQuery(keyword, page));
  const tags = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  const previewName = name.trim();

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function openCreateDialog(): void {
    setEditingTag(null);
    setName("");
    setPriority("0");
    setColor(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(tag: OrganizationPresetTagVO): void {
    setEditingTag(tag);
    setName(tag.name);
    setPriority(String(tag.priority));
    setColor(normalizeProjectMetadataTagColor(tag.color));
    setDialogOpen(true);
  }

  async function handleSave(): Promise<void> {
    try {
      const normalizedName = name.trim();
      if (!normalizedName) {
        $tip("请输入标签名", "error");
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
      const payload = {
        name: normalizedName,
        color: color ?? null,
        priority: normalizedPriority,
      };
      if (editingTag) {
        await updateMutation.mutateAsync([editingTag.id, payload]);
        $tip("标签已更新", "success");
      } else {
        await createMutation.mutateAsync([payload]);
        $tip("标签已创建", "success");
      }
      setDialogOpen(false);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  async function handleDelete(tag: OrganizationPresetTagVO): Promise<void> {
    try {
      const confirmed = await confirm({
        title: "删除标签？",
        description: `删除后不能再选择「${tag.name}」。已经加到企划里的标签不会被移除。`,
        confirmText: "删除",
        variant: "destructive",
      });
      if (!confirmed) return;
      await deleteMutation.mutateAsync([tag.id]);
      $tip("标签已删除", "success");
      if (tags.length === 1 && page > 1) setPage((currentPage) => currentPage - 1);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground">标签</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索标签名"
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
            新增标签
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
          正在加载标签...
        </div>
      ) : tags.length === 0 ? (
        <EmptyState
          title={keyword ? "没有匹配的标签" : "暂无标签"}
          description={keyword ? "换个关键词试试。" : "新增后，成员添加企划标签时可以直接选用。"}
          action={
            keyword ? undefined : (
              <Button type="button" onClick={openCreateDialog}>
                <Plus className="size-4" />
                新增标签
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
                  <TableHead>标签名</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead className="w-40 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => {
                  const isMutating = mutatingId === tag.id;
                  return (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <ProjectMetadataTag
                          tag={{
                            key: tag.name,
                            value: "",
                            color: normalizeProjectMetadataTagColor(tag.color),
                          }}
                        />
                      </TableCell>
                      <TableCell>{tag.priority}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="编辑标签"
                            title="编辑标签"
                            disabled={isMutating}
                            onClick={() => openEditDialog(tag)}
                          >
                            <Edit3 className="size-4" />
                            <span>编辑</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="删除标签"
                            title="删除标签"
                            disabled={isMutating}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void handleDelete(tag)}
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
            <DialogTitle>{editingTag ? "编辑标签" : "新增标签"}</DialogTitle>
            <DialogDescription>
              {editingTag ? "修改标签名、颜色与优先级。" : "新增一个组织成员可选用的标签。"}
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            标签名
            <Input
              value={name}
              maxLength={50}
              autoFocus
              placeholder="例如：加急、作者"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSave();
              }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              颜色
              <Select
                value={color ?? "default"}
                onValueChange={(value: string | null) =>
                  setColor(normalizeProjectMetadataTagColor(value))
                }
              >
                <SelectTrigger size="sm" className="w-28" aria-label="标签颜色">
                  <SelectValue>
                    {color ? PROJECT_METADATA_TAG_COLOR_LABELS[color] : "默认颜色"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="default">默认颜色</SelectItem>
                    {PROJECT_METADATA_TAG_COLORS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PROJECT_METADATA_TAG_COLOR_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            {previewName ? (
              <ProjectMetadataTag tag={{ key: previewName, value: "", color }} />
            ) : null}
          </div>
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
                if (event.key === "Enter") void handleSave();
              }}
            />
            <span className="text-xs font-normal text-muted-foreground">
              只影响用户端下拉顺序，数值越大越靠前，默认 0。
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={mutatingId === (editingTag?.id ?? "new")}
              onClick={() => void handleSave()}
            >
              {mutatingId === (editingTag?.id ?? "new") ? (
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

export default function OrganizationPresetTagsPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationPresetTagsContent />
    </OrganizationAdminGuard>
  );
}
