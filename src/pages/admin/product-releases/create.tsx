import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router";

import { createProductRelease } from "@/api/adminProductRelease";
import AdminLayout from "@/components/AdminLayout";
import { $tip } from "@/components/tip";
import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import {
  formatProductVersion,
  toProductReleasePayload,
  validateProductRelease,
} from "@/lib/productRelease";
import { systemInfoQuery } from "@/queries/admin";
import { productReleaseBaselineQuery } from "@/queries/productRelease";
import { APP_VERSION } from "@/release";

import ProductReleaseEditor, { emptyProductReleaseForm } from "./editor";

import type { ReactElement } from "react";
import type { ProductReleaseFormValues } from "@/types/productRelease";

export default function CreateProductReleasePage(): ReactElement {
  const navigate = useNavigate();
  const baseline = useApiQuery(productReleaseBaselineQuery());
  const system = useApiQuery(systemInfoQuery());
  const [values, setValues] = useState<ProductReleaseFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form =
    values ??
    (system.isPending
      ? null
      : emptyProductReleaseForm({
          frontendVersion: APP_VERSION,
          backendVersion: system.data?.version,
        }));
  const createMutation = useApiMutation({
    scope: "admin",
    mutationFn: createProductRelease,
    invalidate: [["productReleases"]],
  });

  async function submit(publish: boolean): Promise<void> {
    if (!form) return;
    const validation = validateProductRelease(form, publish);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    try {
      const id = await createMutation.mutateAsync(toProductReleasePayload(form, publish));
      $tip(publish ? "已发布" : "已保存草稿", "success");
      void navigate(publish ? "/admin/product-releases" : `/admin/product-releases/${id}`);
    } catch {
      /* 全局提示失败，草稿保留。 */
    }
  }

  return (
    <AdminLayout
      title="新建产品版本"
      description="发布用户可见的更新说明，并绑定这次的前端与后端版本。"
    >
      <div className="flex max-w-2xl flex-col gap-4">
        <ReleaseHint
          latestVersion={baseline.data?.version}
          latestFrontend={baseline.data?.frontendVersion}
          latestBackend={baseline.data?.backendVersion}
          baselineFailed={baseline.isError && !baseline.data}
          systemFailed={system.isError && !system.data}
        />
        {!form ? (
          <div className="flex min-h-48 items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            加载中…
          </div>
        ) : (
          <ProductReleaseEditor
            mode="create"
            values={form}
            error={error}
            pending={createMutation.isPending}
            onChange={(next) => {
              setValues(next);
              setError(null);
            }}
            onSave={() => void submit(false)}
            onPublish={() => void submit(true)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ReleaseHint({
  latestVersion,
  latestFrontend,
  latestBackend,
  baselineFailed,
  systemFailed,
}: {
  latestVersion?: string | null;
  latestFrontend?: string | null;
  latestBackend?: string | null;
  baselineFailed: boolean;
  systemFailed: boolean;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      <p>前端版本和后端版本已按当前构建预填，可以修改。</p>
      {latestVersion ? (
        <p>
          当前最新 {formatProductVersion(latestVersion)}，绑定前端 {latestFrontend} · 后端{" "}
          {latestBackend}。
        </p>
      ) : baselineFailed ? (
        <p>最新产品版本获取失败，不影响填写。</p>
      ) : (
        <p>还没有已发布的产品版本，这是第一条。</p>
      )}
      {systemFailed ? (
        <p className="text-destructive">服务端版本获取失败，请手动填写后端版本。</p>
      ) : null}
    </div>
  );
}
