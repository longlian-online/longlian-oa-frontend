export interface WorkshopListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  projectType?: string;
  isMyCreated?: boolean;
}

export interface WorkshopProjectInfoVO {
  id: string;
  title: string;
  coverUrl?: string;
  creatorAvatarUrl?: string;
  lastSubmitterUsername?: string;
  lastSubmitterAt?: string;
}
