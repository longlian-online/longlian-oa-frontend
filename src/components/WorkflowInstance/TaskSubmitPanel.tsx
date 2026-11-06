import type { ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { UploadedFileInfo } from "@/types/file";
import type { TaskFormField, TaskSubmitValue } from "@/types/task";
import type { TaskSubmitDTO } from "@/types/workflowInstance";

import TaskFormFields from "./TaskFormFields";
import { validateRequiredFields } from "./taskForm";

interface TaskSubmitPanelProps {
  open: boolean;
  taskInstanceId: string;
  taskName: string;
  submitFields: TaskFormField[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: TaskSubmitDTO) => Promise<boolean>;
  submitting: boolean;
  title?: string;
  confirmLabel?: string;
  extra?: ReactNode;
  extraValid?: boolean;
}

export default function TaskSubmitPanel({
  open,
  taskInstanceId,
  taskName,
  submitFields,
  onOpenChange,
  onSubmit,
  submitting,
  title,
  confirmLabel = "提交",
  extra,
  extraValid = true,
}: TaskSubmitPanelProps): ReactElement {
  const [values, setValues] = useState<Record<string, TaskSubmitValue>>({});
  const [uploads, setUploads] = useState<Record<string, UploadedFileInfo | null>>({});
  const submittingLock = useRef(false);

  async function handleSubmit(): Promise<void> {
    if (submittingLock.current) return;
    const validationErrors = validateRequiredFields(submitFields, values);
    if (validationErrors.length > 0) {
      $tip(validationErrors[0], "error");
      return;
    }

    submittingLock.current = true;
    try {
      const succeeded = await onSubmit({ values });
      if (succeeded) onOpenChange(false);
    } finally {
      submittingLock.current = false;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (submitting || details.reason !== "close-press") {
          details.cancel();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? `提交任务：${taskName}`}</DialogTitle>
        </DialogHeader>

        {/* fieldset 默认 min-inline-size: min-content，超长文件名会把弹窗撑出边界 */}
        <fieldset disabled={submitting} className="min-w-0 max-h-[60vh] space-y-3 overflow-y-auto">
          {extra}
          <TaskFormFields
            taskInstanceId={taskInstanceId}
            submitFields={submitFields}
            values={values}
            uploads={uploads}
            disabled={submitting}
            onValueChange={(fieldKey, value) => {
              if (submittingLock.current) return;
              setValues((current) => ({ ...current, [fieldKey]: value }));
            }}
            onFileChange={(fieldKey, file) => {
              if (submittingLock.current) return;
              setUploads((current) => ({ ...current, [fieldKey]: file }));
              setValues((current) => ({
                ...current,
                [fieldKey]: file ? { fileId: file.fileId } : null,
              }));
            }}
          />
        </fieldset>

        <DialogFooter>
          <Button disabled={submitting || !extraValid} onClick={() => void handleSubmit()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
