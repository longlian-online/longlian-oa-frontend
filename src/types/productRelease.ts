export type ProductReleaseStatus = "DRAFT" | "PUBLISHED" | "WITHDRAWN";

export interface ProductReleaseNotice {
  id: string;
  version: string;
  title: string;
  summary: string;
  content: string;
  publishedAt?: string | null;
}

export interface ProductReleaseCurrent {
  release: ProductReleaseNotice | null;
  olderCount: number;
}

export interface ProductReleaseListItem {
  id: string;
  version: string;
  frontendVersion: string;
  backendVersion: string;
  title: string;
  status: ProductReleaseStatus;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export interface ProductReleaseDetail extends ProductReleaseListItem {
  summary: string;
  content: string;
}

export interface ProductReleaseBaseline {
  frontendVersion: string;
  backendVersion: string;
}

export interface ProductReleasePage<T> {
  list: T[];
  total: number;
}

export interface ProductReleaseSaveDTO {
  version: string;
  frontendVersion: string;
  backendVersion: string;
  title: string;
  summary: string;
  content: string;
  publish?: boolean;
}

export interface ProductReleaseFormValues {
  version: string;
  frontendVersion: string;
  backendVersion: string;
  title: string;
  summary: string;
  content: string;
}
