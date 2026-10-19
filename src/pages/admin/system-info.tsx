import { MonitorCog } from "lucide-react";

import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatBuildTime } from "@/lib/format";
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
    <AdminLayout title="系统信息" description="查看当前前后端版本与构建时间。">
      <Card className="w-full max-w-md">
        <CardHeader className="grid-cols-[auto_minmax(0,1fr)] gap-x-3">
          <MonitorCog
            aria-hidden="true"
            className="row-span-2 mt-0.5 size-5 text-muted-foreground"
          />
          <CardTitle>龙联 OA 管理平台</CardTitle>
          <CardDescription className="col-start-2">系统版本信息</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-4" aria-live="polite">
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-baseline gap-x-4 gap-y-4">
            <dt className="text-muted-foreground">前端版本</dt>
            <dd className="min-w-0 text-right font-semibold wrap-anywhere">
              {formatVersion(__APP_VERSION__)}
            </dd>
            <dt className="text-muted-foreground">服务端版本</dt>
            <dd className="min-w-0 text-right font-semibold wrap-anywhere">
              {query.data ? formatVersion(query.data.version) : serverStatus}
            </dd>
            <dt className="text-muted-foreground">前端构建时间</dt>
            <dd className="min-w-0 text-right tabular-nums wrap-anywhere">
              {formatBuildTime(__APP_BUILD_TIME__)}
            </dd>
            <dt className="text-muted-foreground">服务端构建时间</dt>
            <dd className="min-w-0 text-right tabular-nums wrap-anywhere">
              {query.data ? formatBuildTime(query.data.buildTime) : serverStatus}
            </dd>
          </dl>
          {failed && (
            <Button variant="outline" className="self-end" onClick={() => void query.refetch()}>
              加载失败，重试
            </Button>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
