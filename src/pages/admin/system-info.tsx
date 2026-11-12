import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatBuildTime } from "@/lib/format";
import { APP_BUILD_TIME, APP_VERSION } from "@/release";
import { systemInfoQuery } from "@/queries/admin";

import type { ReactElement } from "react";

function formatVersion(value?: string | null): string {
  const version = value?.trim();
  if (!version) return "未知";
  return version.startsWith("v") ? version : `v${version}`;
}

export default function SystemInfoPage(): ReactElement {
  const query = useApiQuery(systemInfoQuery());
  const failed = query.isError && !query.data;
  const serverStatus = failed ? "获取失败" : "加载中…";

  return (
    <AdminLayout title="系统信息">
      <div className="flex flex-col rounded-xl border px-4 py-4" aria-live="polite">
        <h2 className="mb-4 text-base font-medium wrap-anywhere">
          {query.data?.displayName?.trim() || "管理平台"}
        </h2>
        <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-baseline gap-x-4 gap-y-4">
          <dt className="text-muted-foreground">前端版本</dt>
          <dd className="min-w-0 text-right font-semibold wrap-anywhere">
            {formatVersion(APP_VERSION)}
          </dd>
          <dt className="text-muted-foreground">服务端版本</dt>
          <dd className="min-w-0 text-right font-semibold wrap-anywhere">
            {query.data ? formatVersion(query.data.version) : serverStatus}
          </dd>
          <dt className="text-muted-foreground">前端构建时间</dt>
          <dd className="min-w-0 text-right tabular-nums wrap-anywhere">
            {formatBuildTime(APP_BUILD_TIME)}
          </dd>
          <dt className="text-muted-foreground">服务端构建时间</dt>
          <dd className="min-w-0 text-right tabular-nums wrap-anywhere">
            {query.data ? formatBuildTime(query.data.buildTime) : serverStatus}
          </dd>
        </dl>
        {failed && (
          <Button variant="outline" className="mt-4 self-end" onClick={() => void query.refetch()}>
            加载失败，重试
          </Button>
        )}
      </div>
    </AdminLayout>
  );
}
