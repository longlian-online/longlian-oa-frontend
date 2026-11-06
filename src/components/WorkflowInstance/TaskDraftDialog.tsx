import { useRef, useState, type ReactElement } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { $tip } from "@/components/tip";

import TaskFormFields from "./TaskFormFields";
import { validateRequiredFields } from "./taskForm";
import { useTaskDraftEditor } from "./useTaskDraftEditor";

interface TaskDraftDialogProps {
  taskInstanceId: string;
  taskName: string;
  onClose: () => void;
}

export default function TaskDraftDialog({
  taskInstanceId,
  taskName,
  onClose,
}: TaskDraftDialogProps): ReactElement {
  const draftEditor = useTaskDraftEditor(taskInstanceId);
  const confirm = useConfirm();
  const [uploadCount, setUploadCount] = useState(0);
  const closeLock = useRef(false);
  const isBusy =
    draftEditor.isLoading || draftEditor.isRefreshing || draftEditor.isSaving || uploadCount > 0;

  async function handleClose(): Promise<void> {
    if (isBusy || closeLock.current) return;
    closeLock.current = true;
    try {
      if (
        !draftEditor.isDirty ||
        (await confirm({
          title: "放弃未暂存的修改？",
          description: "已暂存的草稿会保留。",
          confirmText: "放弃修改",
        }))
      ) {
        onClose();
      }
    } finally {
      closeLock.current = false;
    }
  }

  async function handleReload(): Promise<void> {
    if (
      draftEditor.isDirty &&
      !(await confirm({
        title: "重新加载草稿？",
        description: "当前未暂存的修改将丢失。",
        confirmText: "重新加载",
      }))
    )
      return;
    await draftEditor.reloadDraft();
  }

  async function handleSubmit(): Promise<void> {
    if (!draftEditor.detail) return;
    const errors = validateRequiredFields(draftEditor.detail.submitFields, draftEditor.values);
    if (errors.length) {
      $tip(errors[0], "error");
      return;
    }
    if (await draftEditor.submitDraft()) {
      $tip("任务已提交", "success");
      onClose();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open, details) => {
        if (!open) {
          details.cancel();
          void handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{taskName}</DialogTitle>
        </DialogHeader>
        {draftEditor.isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">加载中…</p>
        ) : draftEditor.hasLoadError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">草稿加载失败，请重试。</p>
            <Button variant="outline" onClick={() => void handleReload()}>
              重新加载
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {draftEditor.isDirty
                ? "有未暂存的修改"
                : draftEditor.detail?.draft
                  ? "已暂存 " + draftEditor.detail.draft.updatedAt
                  : "尚未暂存"}
              {draftEditor.detail && !draftEditor.detail.canSubmit ? " · 等待前置阶段完成" : ""}
            </p>
            {draftEditor.hasConflict && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span role="alert" className="text-destructive">
                  草稿或任务已更新，请重新加载。
                </span>
                <Button variant="outline" onClick={() => void handleReload()}>
                  重新加载
                </Button>
              </div>
            )}
            <fieldset
              disabled={isBusy || draftEditor.hasConflict}
              className="min-w-0 max-h-[60vh] overflow-y-auto"
            >
              <TaskFormFields
                taskInstanceId={taskInstanceId}
                submitFields={draftEditor.detail?.submitFields ?? []}
                values={draftEditor.values}
                uploads={draftEditor.uploads}
                disabled={isBusy || draftEditor.hasConflict}
                onValueChange={draftEditor.changeValue}
                onFileChange={draftEditor.changeFile}
                onUploadingChange={(uploading) =>
                  setUploadCount((count) => Math.max(0, count + (uploading ? 1 : -1)))
                }
                persistedFileIds={Object.keys(draftEditor.detail?.draft?.files ?? {})}
                onPreviewFile={draftEditor.previewFile}
              />
            </fieldset>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={isBusy} onClick={() => void handleClose()}>
            关闭
          </Button>
          <Button
            variant="outline"
            disabled={
              isBusy ||
              draftEditor.hasConflict ||
              !draftEditor.detail ||
              Boolean(draftEditor.detail.draft && !draftEditor.isDirty)
            }
            onClick={() => void draftEditor.saveDraft()}
          >
            暂存
          </Button>
          <Button
            disabled={
              isBusy ||
              draftEditor.hasConflict ||
              draftEditor.isDirty ||
              !draftEditor.detail?.draft ||
              !draftEditor.detail.canSubmit
            }
            onClick={() => void handleSubmit()}
          >
            {draftEditor.isSaving && <Loader2 className="size-4 animate-spin" />}正式提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
