import type { TaskFormField } from "./task";

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
  baseTaskIcon?: string;
  customName?: string;
  sort: number;
  parallelSort?: number;
}

export interface TaskTemplateOptionVO {
  id: string;
  name: string;
}

export type BaseTaskStatus = "ENABLED" | "DISABLED";

export interface BaseTaskOption {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  status: BaseTaskStatus;
}

export interface BaseTaskVO {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  submitFields: TaskFormField[];
  refCount: number;
  status: BaseTaskStatus;
  createdAt: string;
}
