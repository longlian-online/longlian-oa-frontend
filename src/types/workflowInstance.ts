export type TaskInstanceStatus = "PENDING" | "CLAIMED" | "COMPLETED";

export interface ItemTaskFlowVO {
  name: string;
  description?: string;
  nodes: ItemTaskNodeVO[];
}

export interface ItemTaskNodeVO {
  id: string;
  baseTaskId: string;
  name: string;
  baseTaskIconName?: string;
  baseTaskIconUrl?: string;
  metaSchema?: string;
  sort: number;
  parallelSort: number;
  taskInstanceId?: string | null;
  taskStatus?: TaskInstanceStatus | null;
}

export interface ItemTaskInstanceVO {
  id: string;
  name: string;
  status: TaskInstanceStatus;
  sort: number;
  parallelSort: number;
  assigneeId?: string;
  assigneeNickname?: string;
  assigneeAvatarUrl?: string;
  createdAt: string;
  completedAt?: string | null;
}

export interface TaskInstanceDetailVO {
  metadata?: string | null;
}

export interface TaskSubmitDTO {
  metadata?: string;
}

export interface TaskRejectDTO {
  reviewComment: string;
}
