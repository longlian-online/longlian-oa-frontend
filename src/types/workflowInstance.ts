import type { TaskFormField, TaskSubmitValue } from "./task";

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
  submitFields: TaskFormField[];
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

export type TaskAttachment =
  | {
      id: string;
      name: string;
      sizeText: string;
      mediaType: "image" | "document" | "archive" | "other";
      availability: "available";
      readUrl: string;
      expiresAt: number;
    }
  | { id: string; name: string; availability: "unavailable" };

export type TaskDetailField =
  | { key: string; label: string; type: "text" | "multiline"; text: string }
  | { key: string; label: string; type: "files"; files: TaskAttachment[]; emptyText?: string };

export interface TaskInstanceDetailVO {
  task: {
    id: string;
    name: string;
    stage: number;
    status: TaskInstanceStatus;
    assignee?: { id: string; nickname: string; avatarUrl?: string };
  };
  submission: {
    state: "not_submitted" | "submitted";
    submittedAt?: string;
    fields: TaskDetailField[];
  };
}

export interface TaskSubmitDTO {
  values: Record<string, TaskSubmitValue>;
}

export interface TaskRejectDTO {
  reviewComment: string;
}
