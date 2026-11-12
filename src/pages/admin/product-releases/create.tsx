import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { getListReturnTo } from "@/lib/listReturnTo";

import { createProductRelease } from "@/api/adminProductRelease";
import AdminLayout from "@/components/AdminLayout";
import { $tip } from "@/components/tip";
import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { toProductReleasePayload, validateProductRelease } from "@/lib/productRelease";
import { systemInfoQuery } from "@/queries/admin";
import { APP_VERSION } from "@/release";

import ProductReleaseEditor, { emptyProductReleaseForm } from "./editor";

import type { ReactElement } from "react";
import type { ProductReleaseFormValues } from "@/types/productRelease";

export default function CreateProductReleasePage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();

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
      void navigate(
        publish
          ? getListReturnTo(location.state, "/admin/product-releases")!
          : `/admin/product-releases/${id}`,
        { state: location.state },
      );
    } catch {
      /* 全局提示失败，草稿保留。 */
    }
  }

  return (
    <AdminLayout title="新建产品版本">
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
    </AdminLayout>
  );
}
