export interface WorkshopListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  projectType?: string;
  isMyCreated?: boolean;
}

export interface WorkshopProjectInfoVO {
  id: number;
  title: string;
  coverUrl?: string;
  creatorAvatarUrl?: string;
  lastSubmitterUsername?: string;
  lastSubmitterAt?: string;
}
