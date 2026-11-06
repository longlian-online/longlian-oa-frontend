import type { TaskFormField, TaskSubmitValue } from "./task";

export interface TaskDraftFileVO {
  fileId: string;
  fileName: string;
  fileSize: number | null;
  fileMime: string | null;
  availability: "available" | "unavailable";
  readUrl?: string;
  expiresAt?: number;
}
export interface TaskDraftTaskVO {
  instanceId: string;
  itemId: string;
  revision: string;
  status: "CLAIMED";
}

export interface TaskDraftContentVO {
  id: string;
  revision: string;
  updatedAt: string;
  values: Record<string, TaskSubmitValue>;
  files: Record<string, TaskDraftFileVO>;
}

export interface TaskDraftDetailVO {
  task: TaskDraftTaskVO;
  canSubmit: boolean;
  submitFields: TaskFormField[];
  draftRevision: string;
  draft: TaskDraftContentVO | null;
}

export interface TaskDraftSaveDTO {
  expectedTaskRevision: string;
  expectedDraftRevision: string;
  values: Record<string, TaskSubmitValue>;
}

export interface TaskDraftSubmitDTO {
  expectedTaskRevision: string;
  expectedDraftRevision: string;
}

export interface TaskDraftSubmitResultVO {
  instanceId: string;
  taskRevision: string;
  submissionId: string;
  status: "COMPLETED";
}
