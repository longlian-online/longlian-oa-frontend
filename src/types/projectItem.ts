export type ProjectItemListFilter = "IN_PROGRESS" | "COMPLETED";

export type ProjectItemNodeState = "COMPLETED" | "IN_PROGRESS" | "LOCKED";

export interface ProjectItemCreateDTO {
  title: string;
  taskTemplateId: string;
}

export interface ProjectItemListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  status?: ProjectItemListFilter | "";
  sortByTime?: "CREATE" | "UPDATE";
  orderDir?: "ASC" | "DESC";
}

export interface ProjectItemListVO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
  currentNodeName?: string;
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
