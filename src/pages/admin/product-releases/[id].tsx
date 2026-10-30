import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import {
  publishProductRelease,
  updateProductRelease,
  withdrawProductRelease,
} from "@/api/adminProductRelease";
import AdminLayout from "@/components/AdminLayout";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { toProductReleasePayload, validateProductRelease } from "@/lib/productRelease";
import { adminProductReleaseQuery } from "@/queries/productRelease";

import ProductReleaseEditor from "./editor";

import type { ReactElement } from "react";
import type {
  ProductReleaseDetail,
  ProductReleaseFormValues,
  ProductReleaseStatus,
} from "@/types/productRelease";

function formFromDetail(detail: ProductReleaseDetail): ProductReleaseFormValues {
  return {
    version: detail.version,
    frontendVersion: detail.frontendVersion,
    backendVersion: detail.backendVersion,
    title: detail.title,
    summary: detail.summary,
    added: detail.added.join("\n"),
    changed: detail.changed.join("\n"),
    fixed: detail.fixed.join("\n"),
  };
}

function editorMode(status: ProductReleaseStatus): "draft" | "published" | "withdrawn" {
  if (status === "PUBLISHED") return "published";
  if (status === "WITHDRAWN") return "withdrawn";
  return "draft";
}

export default function EditProductReleasePage(): ReactElement {
  const params = useParams();
  const id = params.id ?? "";
  const navigate = useNavigate();
  const confirm = useConfirm();
  const query = useApiQuery(adminProductReleaseQuery(id));
  const [override, setOverride] = useState<ProductReleaseFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detail = query.data;
  const values = override ?? (detail ? formFromDetail(detail) : null);
  const saveMutation = useApiMutation({
    scope: "admin",
    mutationFn: (dto: ReturnType<typeof toProductReleasePayload>) => updateProductRelease(id, dto),
    invalidate: [["productReleases"]],
  });
  const publishMutation = useApiMutation({
    scope: "admin",
    mutationFn: () => publishProductRelease(id),
    invalidate: [["productReleases"]],
  });
  const withdrawMutation = useApiMutation({
    scope: "admin",
    mutationFn: () => withdrawProductRelease(id),
    invalidate: [["productReleases"]],
  });
  const pending = saveMutation.isPending || publishMutation.isPending || withdrawMutation.isPending;

  async function save(): Promise<void> {
    if (!values || !detail) return;
    const validation = validateProductRelease(values, detail.status === "PUBLISHED");
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    try {
      await saveMutation.mutateAsync(toProductReleasePayload(values));
      $tip("已保存", "success");
      setOverride(null);
      await query.refetch();
    } catch {
      /* 全局提示失败，已填内容保留。 */
    }
  }

  async function publish(): Promise<void> {
    if (!values) return;
    const validation = validateProductRelease(values, true);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    try {
      await saveMutation.mutateAsync(toProductReleasePayload(values));
      await publishMutation.mutateAsync();
      $tip("已发布", "success");
      void navigate("/admin/product-releases");
    } catch {
      /* 保存成功但发布失败时，重新进入仍能看到草稿。 */
    }
  }

  async function withdraw(): Promise<void> {
    const accepted = await confirm({
      title: "撤回这个产品版本",
      description: "撤回后用户将不再看到这条更新说明。",
      confirmText: "撤回",
      variant: "destructive",
    });
    if (!accepted) return;
    try {
      await withdrawMutation.mutateAsync();
      $tip("已撤回", "success");
      setOverride(null);
      await query.refetch();
    } catch {
      /* 全局提示失败。 */
    }
  }

  return (
    <AdminLayout
      title="产品版本"
      description="发布用户可见的更新说明，并绑定这次的前端与后端版本。"
    >
      {query.isError && !detail ? (
        <Button variant="outline" onClick={() => void query.refetch()}>
          加载失败，重试
        </Button>
      ) : !detail || !values ? (
        <div className="flex min-h-48 items-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          加载中…
        </div>
      ) : (
        <ProductReleaseEditor
          mode={editorMode(detail.status)}
          values={values}
          error={error}
          pending={pending}
          onChange={(next) => {
            setOverride(next);
            setError(null);
          }}
          onSave={() => void save()}
          onPublish={() => void publish()}
          onWithdraw={() => void withdraw()}
        />
      )}
    </AdminLayout>
  );
}
