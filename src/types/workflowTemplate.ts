export type WorkflowTemplateScope = "PERSONAL" | "ORGANIZATION";

export interface WorkshopTaskTemplateDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
}

export interface WorkshopTaskTemplateCreateDTO {
  name: string;
  description?: string;
  nodes: WorkshopTaskTemplateNodeCreateDTO[];
}

export interface WorkshopTaskTemplateNodeCreateDTO {
  baseTaskId: string;
  customName?: string;
  sort: number;
  parallelSort?: number;
}

export interface WorkshopTaskTemplateVO {
  id: string;
  name: string;
  description?: string;
  scope: WorkflowTemplateScope;
  taskCount: number;
  nodes: WorkshopTaskTemplateNodeVO[];
  isMine: boolean;
}

export interface WorkshopTaskTemplateNodeVO {
  id?: string;
  baseTaskId: string;
  baseTaskName?: string;
  baseTaskIconUrl?: string;
  customName?: string;
  sort: number;
  parallelSort?: number;
}

export interface TaskTemplateOptionVO {
  id: string;
  name: string;
}

export interface BaseTaskListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  status?: "ENABLED" | "DISABLED";
  sortBy?: "createdAt" | "refCount";
  orderDir?: "DESC" | "ASC";
}

export interface BaseTaskVO {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  metaSchema?: string;
  refCount: number;
  status: "ENABLED" | "DISABLED";
  createdAt: string;
}
