import { ApiError } from "@/api/apiError";
import {
  getAdminProductRelease,
  getProductReleaseBaseline,
  listAdminProductReleases,
} from "@/api/adminProductRelease";
import { getCurrentProductRelease, listProductReleases } from "@/api/productRelease";
import type { ApiQueryOptions } from "@/lib/apiQuery";

import type {
  ProductReleaseBaseline,
  ProductReleaseCurrent,
  ProductReleaseDetail,
  ProductReleaseListItem,
  ProductReleaseNotice,
  ProductReleasePage,
  ProductReleaseStatus,
} from "@/types/productRelease";

export const ADMIN_PRODUCT_RELEASE_PAGE_SIZE = 10;

export function currentProductReleaseQuery(): ApiQueryOptions<ProductReleaseCurrent> {
  return {
    key: ["productReleases", "current"],
    scope: "account",
    queryFn: async () => {
      try {
        return await getCurrentProductRelease();
      } catch (error) {
        if (error instanceof ApiError) error.silence();
        throw error;
      }
    },
  };
}

export function productReleaseHistoryQuery(
  page = 1,
): ApiQueryOptions<ProductReleasePage<ProductReleaseNotice>> {
  return {
    key: ["productReleases", "history", page],
    scope: "account",
    queryFn: () => listProductReleases(page, ADMIN_PRODUCT_RELEASE_PAGE_SIZE),
  };
}

export function adminProductReleasesQuery(
  page = 1,
  status?: ProductReleaseStatus,
): ApiQueryOptions<ProductReleasePage<ProductReleaseListItem>> {
  return {
    key: ["productReleases", "admin", page, status ?? "ALL"],
    scope: "admin",
    queryFn: () =>
      listAdminProductReleases({
        pageNum: page,
        pageSize: ADMIN_PRODUCT_RELEASE_PAGE_SIZE,
        status,
      }),
  };
}

export function productReleaseBaselineQuery(): ApiQueryOptions<ProductReleaseBaseline | null> {
  return {
    key: ["productReleases", "baseline"],
    scope: "admin",
    queryFn: getProductReleaseBaseline,
  };
}

export function adminProductReleaseQuery(id: string): ApiQueryOptions<ProductReleaseDetail> {
  return {
    key: ["productReleases", "admin", id],
    scope: "admin",
    queryFn: () => getAdminProductRelease(id),
    enabled: Boolean(id),
  };
}
