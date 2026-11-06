import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/apiError";
import { TASK_DRAFT_CONFLICT_MESSAGE } from "@/api/taskDraft";
import {
  closeAttachmentPreview,
  openAttachmentPreview,
} from "@/components/AttachmentPreview/previewSession";
import { $tip } from "@/components/tip";
import { useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { useSaveTaskDraft, useSubmitTaskDraft } from "@/hooks/queries/useTaskDraftMutations";
import { apiQueryOptions } from "@/lib/apiQuery";
import { taskDraftQuery } from "@/queries/taskDraft";
import type { UploadedFileInfo } from "@/types/file";
import type { TaskSubmitValue } from "@/types/task";
import type { TaskDraftDetailVO } from "@/types/taskDraft";

import { createItemLifecycle } from "./itemLifecycle";
import { areTaskFormValuesEqual } from "./taskForm";

interface TaskDraftFormState {
  identity: string;
  taskRevision: string;
  draftRevision: string;
  savedValues: Record<string, TaskSubmitValue>;
  values: Record<string, TaskSubmitValue>;
  uploads: Record<string, UploadedFileInfo | null>;
  hasRevisionConflict: boolean;
}

export interface TaskDraftEditor {
  detail: TaskDraftDetailVO | null;
  values: Record<string, TaskSubmitValue>;
  uploads: Record<string, UploadedFileInfo | null>;
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  hasLoadError: boolean;
  hasConflict: boolean;
  isDirty: boolean;
  changeValue: (fieldKey: string, value: TaskSubmitValue) => void;
  changeFile: (fieldKey: string, file: UploadedFileInfo | null) => void;
  reloadDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;
  submitDraft: () => Promise<boolean>;
  previewFile: (fieldKey: string) => void;
}

function createDraftForm(detail: TaskDraftDetailVO, identity: string): TaskDraftFormState {
  const uploads: Record<string, UploadedFileInfo | null> = {};
  for (const field of detail.submitFields) {
    const value = detail.draft?.values[field.key];
    if (field.type !== "file" || !value || typeof value !== "object") continue;
    const file = detail.draft?.files[value.fileId];
    if (file) {
      uploads[field.key] = {
        fileId: file.fileId,
        fileName: file.fileName,
        fileSize: file.fileSize ?? 0,
        fileMime: file.fileMime ?? "",
      };
    }
  }
  return {
    identity,
    taskRevision: detail.task.revision,
    draftRevision: detail.draftRevision,
    savedValues: detail.draft?.values ?? {},
    values: detail.draft?.values ?? {},
    uploads,
    hasRevisionConflict: false,
  };
}

export function useTaskDraftEditor(instanceId: string): TaskDraftEditor {
  const client = useQueryClient();
  const session = useSessionSnapshot();
  const identity = JSON.stringify([session.appScope, session.orgId, instanceId]);
  const lifecycle = useRef(createItemLifecycle(identity));
  lifecycle.current.switchTo(identity);
  const previewOwner = useRef(Symbol("task-draft-preview"));
  const saveMutation = useSaveTaskDraft(instanceId);
  const submitMutation = useSubmitTaskDraft(instanceId);
  const draftQuery = taskDraftQuery(instanceId);
  const query = useApiQuery({
    ...draftQuery,
    enabled: draftQuery.enabled && !submitMutation.isPending && !submitMutation.isSuccess,
  });
  const writeLock = useRef(false);
  const [formState, setFormState] = useState<TaskDraftFormState | null>(null);
  const detail = query.data ?? null;
  const form = formState?.identity === identity ? formState : null;

  useEffect(() => {
    lifecycle.current.switchTo(identity);
    return () => {
      lifecycle.current.switchTo("");
      closeAttachmentPreview(previewOwner.current);
    };
  }, [identity]);

  useEffect(() => {
    if (!detail) return;
    // 后台刷新只更新查询结果，编辑中的字段和用于提交的修订号保留到主动重新加载。
    setFormState((current) =>
      current?.identity === identity ? current : createDraftForm(detail, identity),
    );
  }, [detail, identity]);

  const hasConflict = Boolean(
    form &&
    (form.hasRevisionConflict ||
      detail?.draftRevision !== form.draftRevision ||
      detail?.task.revision !== form.taskRevision),
  );
  const isDirty = Boolean(form && !areTaskFormValuesEqual(form.values, form.savedValues));

  function changeValue(fieldKey: string, value: TaskSubmitValue): void {
    setFormState((current) =>
      current?.identity === identity
        ? { ...current, values: { ...current.values, [fieldKey]: value } }
        : current,
    );
  }

  function changeFile(fieldKey: string, file: UploadedFileInfo | null): void {
    setFormState((current) =>
      current?.identity === identity
        ? {
            ...current,
            values: { ...current.values, [fieldKey]: file ? { fileId: file.fileId } : null },
            uploads: { ...current.uploads, [fieldKey]: file },
          }
        : current,
    );
  }

  function markRevisionConflict(error: unknown): void {
    if (
      error instanceof ApiError &&
      error.code === 5 &&
      error.message === TASK_DRAFT_CONFLICT_MESSAGE
    ) {
      setFormState((current) =>
        current?.identity === identity ? { ...current, hasRevisionConflict: true } : current,
      );
    }
  }

  async function reloadDraft(): Promise<void> {
    const isCurrent = lifecycle.current.capture();
    const result = await query.refetch();
    if (result.data && !result.isError && isCurrent()) {
      setFormState(createDraftForm(result.data, identity));
    }
  }

  async function saveDraft(): Promise<void> {
    if (!form || writeLock.current || hasConflict) return;
    const isCurrent = lifecycle.current.capture();
    writeLock.current = true;
    try {
      const saved = await saveMutation.mutateAsync({
        expectedTaskRevision: form.taskRevision,
        expectedDraftRevision: form.draftRevision,
        values: form.values,
      });
      if (isCurrent()) {
        setFormState(createDraftForm(saved, identity));
        $tip("草稿已暂存", "success");
      }
    } catch (error) {
      if (isCurrent()) markRevisionConflict(error);
    } finally {
      writeLock.current = false;
    }
  }

  async function submitDraft(): Promise<boolean> {
    if (!form || !detail?.draft || !detail.canSubmit || isDirty || hasConflict || writeLock.current)
      return false;
    const isCurrent = lifecycle.current.capture();
    writeLock.current = true;
    try {
      await submitMutation.mutateAsync({
        expectedTaskRevision: form.taskRevision,
        expectedDraftRevision: form.draftRevision,
      });
      return isCurrent();
    } catch (error) {
      if (isCurrent()) markRevisionConflict(error);
      return false;
    } finally {
      writeLock.current = false;
    }
  }

  function previewFile(fieldKey: string): void {
    const value = form?.values[fieldKey];
    const file = value && typeof value === "object" ? detail?.draft?.files[value.fileId] : null;
    if (!file || !form || hasConflict) return;
    const isCurrent = lifecycle.current.capture();
    openAttachmentPreview({
      owner: previewOwner.current,
      fileName: file.fileName,
      fileSize: file.fileSize ?? undefined,
      resolveUrl: async (signal): Promise<string> => {
        signal.throwIfAborted();
        const fresh = await client.fetchQuery(apiQueryOptions(taskDraftQuery(instanceId), session));
        signal.throwIfAborted();
        if (!isCurrent()) throw new DOMException("草稿已关闭", "AbortError");
        if (
          fresh.draftRevision !== form.draftRevision ||
          fresh.task.revision !== form.taskRevision
        ) {
          throw new Error("草稿已更新，请重新加载后查看");
        }
        const url = fresh.draft?.files[file.fileId]?.readUrl;
        if (!url) throw new Error("附件不可用，请重新上传并暂存");
        return url;
      },
    });
  }

  return {
    detail,
    values: form?.values ?? {},
    uploads: form?.uploads ?? {},
    isLoading: query.isLoading || Boolean(detail && !form),
    isRefreshing: query.isRefetching,
    isSaving: saveMutation.isPending || submitMutation.isPending,
    hasLoadError: query.isError && !detail,
    hasConflict,
    isDirty,
    changeValue,
    changeFile,
    reloadDraft,
    saveDraft,
    submitDraft,
    previewFile,
  };
}
