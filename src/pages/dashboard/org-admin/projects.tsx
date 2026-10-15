import { useState } from "react";
import { useNavigate } from "react-router";
import { Ban, CheckCircle2, FolderOpen, Loader2, Search } from "lucide-react";

import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { changeProjectStatus, getOrganizationProjects } from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import type { OrganizationProjectStatus, OrganizationProjectVO } from "@/types/organizationAdmin";

const PAGE_SIZE = 8;

function getStatusLabel(status: OrganizationProjectStatus): string {
  if (status === "已完成") return "已完成";
  if (status === "已归档") return "已归档";
  return "进行中";
}

function OrganizationAdminProjectsContent() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const changeProjectStatusMutation = useApiMutation<
    Awaited<ReturnType<typeof changeProjectStatus>>,
    Parameters<typeof changeProjectStatus>
  >({
    mutationFn: (args) => changeProjectStatus(...args),
    invalidate: [["projects"], ["workshop"], ["plaza"]],
  });
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const mutatingId = changeProjectStatusMutation.isPending
    ? String(changeProjectStatusMutation.variables?.[0] ?? "new")
    : null;

  const listQuery = useApiQuery({
    key: ["projects", "management", keyword, page],
    queryFn: () =>
      getOrganizationProjects({
        keyword: keyword || undefined,
        pageNum: page,
        pageSize: PAGE_SIZE,
      }),
  });
  const projects = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  async function handleChangeStatus(project: OrganizationProjectVO): Promise<void> {
    try {
      const disabled = project.resourceStatus === "DISABLED";
      const confirmed = await confirm({
        title: disabled ? "启用企划？" : "禁用企划？",
        description: disabled
          ? `启用后「${project.title}」会重新出现在用户端。`
          : `禁用后「${project.title}」将不再在用户端展示，已有数据会保留。`,
        confirmText: disabled ? "启用" : "禁用",
        variant: disabled ? "default" : "destructive",
      });
      if (!confirmed) return;

      await changeProjectStatusMutation.mutateAsync([
        String(project.id),
        disabled ? "ENABLED" : "DISABLED",
      ]);
      $tip(disabled ? "企划已启用" : "企划已禁用", "success");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">企划管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理组织内企划的展示状态。</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索企划"
              className="pl-9"
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            搜索
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
          正在加载企划...
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-5 text-muted-foreground" />}
          title="暂无企划"
          description="当前没有符合条件的企划。"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>企划</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const disabled = project.resourceStatus === "DISABLED";
                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="min-w-52 text-left"
                          onClick={() => void navigate(`/dashboard/planning/${project.id}`)}
                        >
                          <span className="truncate font-medium text-foreground">
                            {project.title ?? "未命名企划"}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.typeName ?? "未分类"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.creatorNickname ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(project.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={disabled ? "secondary" : "outline"}>
                          {disabled ? "已禁用" : getStatusLabel(project.status ?? "进行中")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={disabled ? "启用企划" : "禁用企划"}
                          title={disabled ? "启用企划" : "禁用企划"}
                          disabled={mutatingId === project.id}
                          className={
                            disabled
                              ? "text-muted-foreground"
                              : "text-destructive hover:bg-destructive/10 hover:text-destructive"
                          }
                          onClick={() => void handleChangeStatus(project)}
                        >
                          {mutatingId === project.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : disabled ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            <Ban className="size-4" />
                          )}
                          <span>{disabled ? "启用" : "禁用"}</span>
                        </Button>
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
    </div>
  );
}

export default function OrganizationAdminProjectsPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationAdminProjectsContent />
    </OrganizationAdminGuard>
  );
}
