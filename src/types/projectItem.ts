export type ProjectItemListFilter = "IN_PROGRESS" | "COMPLETED";

export type ProjectItemNodeState = "COMPLETED" | "IN_PROGRESS" | "LOCKED";

export type ProjectItemSortBy =
  | "MANUAL"
  | "CREATED_ASC"
  | "CREATED_DESC"
  | "UPDATED_ASC"
  | "UPDATED_DESC";

export interface ProjectItemOrderEntryVO {
  id: string;
  title: string;
}

export interface ProjectItemReorderDTO {
  expectedItemIds: string[];
  itemIds: string[];
}

export interface ProjectItemCreateDTO {
  title: string;
  taskTemplateId: string;
}

export interface ProjectItemListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  status?: ProjectItemListFilter | "";
  sortBy?: ProjectItemSortBy;
}

export interface ProjectItemListVO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
  currentNodeName?: string;
  hasSubmittedTask?: boolean;
  nodes: ProjectItemNodeVO[];
}

export interface ProjectItemNodeVO {
  name: string;
  sort: number;
  parallelSort: number;
  state: ProjectItemNodeState;
  parallelCount: number;
}

export interface TaskTemplateOptionVO {
  id: string;
  name: string;
}
