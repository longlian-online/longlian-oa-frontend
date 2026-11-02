import { useState } from "react";
import { Link } from "react-router";
import { Loader2, ScrollText } from "lucide-react";

import AdminLayout from "@/components/AdminLayout";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatProductVersion, formatReleaseTime, statusLabel } from "@/lib/productRelease";
import {
  ADMIN_PRODUCT_RELEASE_PAGE_SIZE,
  adminProductReleasesQuery,
} from "@/queries/productRelease";

import type { ReactElement } from "react";
import type { ProductReleaseStatus } from "@/types/productRelease";

const FILTERS: { label: string; value?: ProductReleaseStatus }[] = [
  { label: "全部" },
  { label: "草稿", value: "DRAFT" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "已撤回", value: "WITHDRAWN" },
];

export default function ProductReleaseListPage(): ReactElement {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ProductReleaseStatus | undefined>();
  const query = useApiQuery(adminProductReleasesQuery(page, status));

  return (
    <AdminLayout
      title="产品版本"
      description="发布用户可见的更新说明，并绑定这次的前端与后端版本。"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((filter) => {
              const selected = filter.value === status;
              return (
                <Button
                  key={filter.label}
                  type="button"
                  size="sm"
                  variant={selected ? "secondary" : "ghost"}
                  aria-pressed={selected}
                  onClick={() => {
                    setStatus(filter.value);
                    setPage(1);
                  }}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
          <Button nativeButton={false} render={<Link to="/admin/product-releases/create" />}>
            新建
          </Button>
        </div>
        {query.isError && !query.data ? (
          <Button variant="outline" className="self-start" onClick={() => void query.refetch()}>
            加载失败，重试
          </Button>
        ) : query.isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            加载中…
          </div>
        ) : (query.data?.list.length ?? 0) === 0 ? (
          <EmptyState
            icon={<ScrollText className="size-5 text-muted-foreground" />}
            title="还没有产品版本"
            description="新建一条草稿，发布后用户才会看到更新说明。"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {query.data?.list.map((release) => (
              <Link
                key={release.id}
                to={`/admin/product-releases/${release.id}`}
                className="flex flex-col gap-1 rounded-xl border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{formatProductVersion(release.version)}</span>
                  <span className="text-xs text-muted-foreground">
                    {statusLabel(release.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  前端 {release.frontendVersion} · 后端 {release.backendVersion}
                </p>
                {release.title ? <p className="text-sm">{release.title}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {formatReleaseTime(release.publishedAt || release.updatedAt)}
                </p>
              </Link>
            ))}
            <PaginationBar
              page={page}
              pageSize={ADMIN_PRODUCT_RELEASE_PAGE_SIZE}
              total={query.data?.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
