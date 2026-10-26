import { useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import AdminLayout from "@/components/AdminLayout";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBytes, formatStorageUsage } from "@/lib/format";
import { ADMIN_PAGE_SIZE as PAGE_SIZE, storageStatsQuery } from "@/queries/admin";

import type { StorageCategoryStatsVO, StorageStateStatsVO, StorageStatsVO } from "@/types/admin";

const STATES = [
  { key: "unbound", label: "未绑定" },
  { key: "active", label: "使用中" },
  { key: "retention", label: "保留中" },
  { key: "recycled", label: "已回收" },
] as const;

const CATEGORIES = [
  { key: "cover", label: "封面" },
  { key: "thumbnail", label: "缩略图" },
  { key: "taskSubmit", label: "任务附件" },
] as const;

function readState(
  category: StorageCategoryStatsVO | undefined,
  key: (typeof STATES)[number]["key"],
): StorageStateStatsVO {
  const state = category?.[key];
  return { count: state?.count ?? 0, bytes: state?.bytes ?? 0 };
}

function byteTitle(bytes: number): string {
  return `${Number.isFinite(bytes) ? bytes : 0} 字节`;
}

function OrganizationStorage({ organization }: { organization: StorageStatsVO }) {
  return (
    <section className="border-border border-b py-5 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">{organization.name}</h2>
          <Badge variant={organization.status === "ENABLED" ? "default" : "secondary"}>
            {organization.status === "ENABLED" ? "启用" : "禁用"}
          </Badge>
        </div>
        <dl className="flex gap-6 text-sm tabular-nums">
          <div>
            <dt className="inline text-muted-foreground">仍占用 </dt>
            <dd className="inline font-medium" title={byteTitle(organization.occupiedBytes)}>
              {formatBytes(organization.occupiedBytes)}
            </dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">已回收 </dt>
            <dd className="inline" title={byteTitle(organization.reclaimedBytes)}>
              {formatBytes(organization.reclaimedBytes)}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="w-24 py-1 pr-3 font-normal">类别</th>
              {STATES.map((state) => (
                <th key={state.key} className="py-1 pr-3 font-normal">
                  {state.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((category) => (
              <tr key={category.key} className="border-border/70 border-t">
                <th className="py-2 pr-3 text-left font-medium">{category.label}</th>
                {STATES.map((state) => {
                  const value = readState(organization[category.key], state.key);
                  return (
                    <td
                      key={state.key}
                      className="py-2 pr-3 tabular-nums"
                      title={byteTitle(value.bytes)}
                    >
                      {formatStorageUsage(value.count, value.bytes)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function StorageStatsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const listQuery = useApiQuery(storageStatsQuery(page, keyword));
  const organizations = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;

  function handleSearch(): void {
    setPage(1);
    setKeyword(searchText.trim());
  }

  return (
    <AdminLayout
      title="存储占用"
      description="封面、缩略图和任务附件的占用。保留期内的废弃文件仍算占用，物理删除后算已回收。不含头像，数字只供参考。"
    >
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-2 flex gap-2">
            <Input
              value={searchText}
              maxLength={32}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="搜索组织名称"
              aria-label="搜索组织名称"
              className="w-56"
            />
            <Button type="button" variant="outline" onClick={handleSearch}>
              搜索
            </Button>
          </div>
          {listQuery.isError && !listQuery.data ? (
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              加载失败，重试
            </Button>
          ) : listQuery.isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载中...
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState
              icon={<HardDrive className="size-5 text-muted-foreground" />}
              title="暂无组织"
              description="当前没有符合条件的组织。"
            />
          ) : (
            <>
              {organizations.map((organization) => (
                <OrganizationStorage key={organization.id} organization={organization} />
              ))}
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                disabled={listQuery.isLoading}
                onPageChange={setPage}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
