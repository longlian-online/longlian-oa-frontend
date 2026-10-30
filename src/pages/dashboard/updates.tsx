import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { ApiError } from "@/api/apiError";
import { markProductReleaseSeen } from "@/api/productRelease";
import PaginationBar from "@/components/PaginationBar";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatProductVersion, formatReleaseTime } from "@/lib/productRelease";
import {
  ADMIN_PRODUCT_RELEASE_PAGE_SIZE,
  productReleaseHistoryQuery,
} from "@/queries/productRelease";

import type { ReactElement } from "react";
import type { ProductReleaseNotice } from "@/types/productRelease";

const GROUPS = [
  ["added", "新增"],
  ["changed", "调整"],
  ["fixed", "修复"],
] as const;

export default function ProductReleaseHistoryPage(): ReactElement {
  const [page, setPage] = useState(1);
  const query = useApiQuery(productReleaseHistoryQuery(page));
  const latestId = page === 1 ? query.data?.list[0]?.id : undefined;

  useEffect(() => {
    if (!latestId) return;
    void markProductReleaseSeen(latestId).catch((error: unknown) => {
      if (error instanceof ApiError) error.silence();
    });
  }, [latestId]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-lg font-semibold">更新记录</h1>
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
        <p className="text-sm text-muted-foreground">还没有更新说明</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {query.data?.list.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
          <PaginationBar
            page={page}
            pageSize={ADMIN_PRODUCT_RELEASE_PAGE_SIZE}
            total={query.data?.total ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function ReleaseCard({ release }: { release: ProductReleaseNotice }): ReactElement {
  return (
    <article className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-base font-semibold">{formatProductVersion(release.version)}</h2>
        <time className="text-xs text-muted-foreground">
          {formatReleaseTime(release.publishedAt)}
        </time>
      </div>
      {release.summary ? <p className="text-sm">{release.summary}</p> : null}
      {GROUPS.map(([key, label]) =>
        release[key].length === 0 ? null : (
          <section key={key}>
            <h3 className="text-sm font-medium">{label}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {release[key].map((item, index) => (
                <li key={`${release.id}-${key}-${index}`}>{item}</li>
              ))}
            </ul>
          </section>
        ),
      )}
    </article>
  );
}
