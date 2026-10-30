import { ApiError } from "@/api/apiError";
import { request } from "@/api/request";

import type {
  ProductReleaseCurrent,
  ProductReleaseNotice,
  ProductReleasePage,
} from "@/types/productRelease";

function asId(value: string | number): string {
  return String(value);
}

function notice(raw: ProductReleaseNotice): ProductReleaseNotice {
  return { ...raw, id: asId(raw.id) };
}

export async function getCurrentProductRelease(): Promise<ProductReleaseCurrent> {
  const current = await request<ProductReleaseCurrent>("/product-releases/current");
  return {
    olderCount: current?.olderCount ?? 0,
    release: current?.release ? notice(current.release) : null,
  };
}

export async function listProductReleases(
  pageNum = 1,
  pageSize = 10,
): Promise<ProductReleasePage<ProductReleaseNotice>> {
  const page = await request<ProductReleasePage<ProductReleaseNotice>>(
    `/product-releases/?pageNum=${pageNum}&pageSize=${pageSize}`,
  );
  return { total: page?.total ?? 0, list: (page?.list ?? []).map(notice) };
}

export async function markProductReleaseSeen(id: string): Promise<void> {
  try {
    await request<void>(`/product-releases/${id}/seen`, { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError) error.silence();
    throw error;
  }
}
