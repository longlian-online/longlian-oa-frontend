import { withQuery } from "@/api/queryString";
import { adminRequest } from "@/api/request";

import type {
  ProductReleaseBaseline,
  ProductReleaseDetail,
  ProductReleaseListItem,
  ProductReleasePage,
  ProductReleaseSaveDTO,
  ProductReleaseStatus,
} from "@/types/productRelease";

function asId(value: string | number): string {
  return String(value);
}

function statusOf(value: unknown): ProductReleaseStatus {
  if (value === 1 || value === "PUBLISHED") return "PUBLISHED";
  if (value === 2 || value === "WITHDRAWN") return "WITHDRAWN";
  return "DRAFT";
}

function listItem(raw: ProductReleaseListItem): ProductReleaseListItem {
  return { ...raw, id: asId(raw.id), status: statusOf(raw.status) };
}

function detail(raw: ProductReleaseDetail): ProductReleaseDetail {
  return {
    ...listItem(raw),
    summary: raw.summary ?? "",
    content: raw.content ?? "",
  };
}

export async function listAdminProductReleases(query: {
  pageNum: number;
  pageSize: number;
  status?: ProductReleaseStatus;
}): Promise<ProductReleasePage<ProductReleaseListItem>> {
  const page = await adminRequest<ProductReleasePage<ProductReleaseListItem>>(
    withQuery("/admin/product-releases/", query),
  );
  return { total: page?.total ?? 0, list: (page?.list ?? []).map(listItem) };
}

export async function getProductReleaseBaseline(): Promise<ProductReleaseBaseline | null> {
  // 后端在还没有已发布版本时返回 data:null；旧响应可能省略该字段，这里统一成 null。
  return (
    (await adminRequest<ProductReleaseBaseline | null>("/admin/product-releases/baseline")) ?? null
  );
}

export async function getAdminProductRelease(id: string): Promise<ProductReleaseDetail> {
  return detail(await adminRequest<ProductReleaseDetail>(`/admin/product-releases/${id}`));
}

export async function createProductRelease(dto: ProductReleaseSaveDTO): Promise<string> {
  return asId(
    await adminRequest<string | number>("/admin/product-releases/", {
      method: "POST",
      body: JSON.stringify(dto),
    }),
  );
}

export async function updateProductRelease(id: string, dto: ProductReleaseSaveDTO): Promise<void> {
  await adminRequest<void>(`/admin/product-releases/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function publishProductRelease(id: string): Promise<void> {
  await adminRequest<void>(`/admin/product-releases/${id}/publish`, { method: "POST" });
}

export async function withdrawProductRelease(id: string): Promise<void> {
  await adminRequest<void>(`/admin/product-releases/${id}/withdraw`, { method: "POST" });
}
