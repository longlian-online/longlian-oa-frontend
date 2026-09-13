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
  baseTaskIconName?: string;
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
  startCreatedTime?: string;
  endCreatedTime?: string;
  sortBy?: "CREATED_AT" | "REF_COUNT";
  orderDir?: "DESC" | "ASC";
}

export type BaseTaskStatus = "ENABLED" | "DISABLED";

export interface BaseTaskCreateDTO {
  name: string;
  description?: string;
  iconFileId?: string;
  iconName?: string;
  metaSchema?: string;
}

export interface BaseTaskVO {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  iconUrl?: string;
  metaSchema?: string;
  refCount: number;
  status: BaseTaskStatus;
  createdAt: string;
}
