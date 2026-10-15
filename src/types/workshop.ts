export type WorkshopSortBy = "RECENT_SUBMISSION" | "CREATED_DESC" | "CREATED_ASC";

export interface WorkshopListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  projectType?: string;
  isMyCreated?: boolean;
  sortBy?: WorkshopSortBy;
}

export interface WorkshopProjectInfoVO {
  id: string;
  title: string;
  coverUrl?: string;
  creatorAvatarUrl?: string;
  lastSubmitterUsername?: string;
  lastSubmitterAt?: string;
}
