import type { TaskFormField, TaskSubmitValue } from "./task";

export type TaskInstanceStatus = "PENDING" | "CLAIMED" | "COMPLETED";

export interface TaskClaimResultVO {
  autoJoinedProject: boolean;
}

export interface ItemTaskFlowVO {
  itemTitle: string;
  name: string;
  description?: string;
  nodes: ItemTaskNodeVO[];
}

export interface ItemTaskNodeVO {
  id: string;
  baseTaskId: string;
  name: string;
  baseTaskIcon?: string;
  submitFields: TaskFormField[];
  sort: number;
  parallelSort: number;
  taskInstanceId?: string | null;
  taskStatus?: TaskInstanceStatus | null;
}

export interface ItemTaskInstanceVO {
  id: string;
  revision: string;
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
  | { key: string; label: string; type: "file"; file: TaskAttachment | null };

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

export type TaskSubmissionStatus = "SUBMITTED" | "REJECTED" | "RESET";

export interface TaskSubmissionPerson {
  id: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface TaskSubmissionVersionVO {
  versionNo: number;
  status: TaskSubmissionStatus;
  submittedAt?: string | null;
  submitter?: TaskSubmissionPerson | null;
  reviewedAt?: string | null;
  reviewer?: TaskSubmissionPerson | null;
  reviewComment?: string | null;
  fields: TaskDetailField[];
  unreadable: boolean;
}

export interface TaskRejectDTO {
  expectedRevision: string;
  reviewComment: string;
}

export interface TaskAbandonDTO {
  expectedRevision: string;
}

export interface TaskAssignDTO {
  assigneeId: string;
  expectedRevision: string;
}

export interface AssignableMemberVO {
  userId: string;
  nickname?: string | null;
  username?: string | null;
}
