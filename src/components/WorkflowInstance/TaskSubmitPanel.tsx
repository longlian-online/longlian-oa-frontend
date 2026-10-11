import { useState } from "react";
import { Loader2 } from "lucide-react";

import FileUpload from "@/components/FileUpload";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UploadedFileInfo } from "@/types/file";
import type { TaskFormField, TaskSubmitValue } from "@/types/task";
import type { TaskSubmitDTO } from "@/types/workflowInstance";

interface TaskSubmitPanelProps {
  open: boolean;
  taskInstanceId: string;
  taskName: string;
  submitFields: TaskFormField[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: TaskSubmitDTO) => Promise<boolean>;
}

export function validateRequiredFields(
  fields: TaskFormField[],
  values: Record<string, TaskSubmitValue>,
): string[] {
  return fields.flatMap((field) => {
    if (!field.required) return [];
    const value = values[field.key];
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (typeof value === "object" && value.fileId.trim() === "");
    return isEmpty ? [`请填写${field.label}`] : [];
  });
}

export default function TaskSubmitPanel({
  open,
  taskInstanceId,
  taskName,
  submitFields,
  onOpenChange,
  onSubmit,
}: TaskSubmitPanelProps) {
  const [values, setValues] = useState<Record<string, TaskSubmitValue>>({});
  const [uploads, setUploads] = useState<Record<string, UploadedFileInfo | null>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (submitting) return;
    const validationErrors = validateRequiredFields(submitFields, values);
    if (validationErrors.length > 0) {
      $tip(validationErrors[0], "error");
      return;
    }

    try {
      setSubmitting(true);
      const succeeded = await onSubmit({ values });
      if (succeeded) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>提交任务：{taskName}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={submitting} className="max-h-[60vh] space-y-3 overflow-y-auto">
          {submitFields.length === 0 ? (
            <div className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              该任务没有额外提交字段，确认后会直接提交。
            </div>
          ) : (
            submitFields.map((field) => {
              const value = values[field.key];
              const textValue = typeof value === "string" ? value : "";
              return (
                <div key={field.key} className="flex flex-col gap-2 text-sm text-foreground">
                  <label htmlFor={`task-field-${field.key}`}>
                    {field.label}
                    {field.required && <span className="ml-1 text-destructive">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={`task-field-${field.key}`}
                      value={textValue}
                      className="min-h-24 resize-none"
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                    />
                  ) : field.type === "file" ? (
                    <FileUpload
                      bizType="task_submit"
                      bizId={taskInstanceId}
                      value={uploads[field.key] ?? null}
                      title={`上传${field.label}`}
                      description="支持图片、文档或压缩包"
                      onChange={(file) => {
                        if (submitting) return;
                        setUploads((current) => ({ ...current, [field.key]: file }));
                        setValues((current) => ({
                          ...current,
                          [field.key]: file ? { fileId: file.fileId } : null,
                        }));
                      }}
                    />
                  ) : field.type === "select" ? (
                    <Select
                      disabled={submitting}
                      value={textValue}
                      onValueChange={(nextValue: string | null) =>
                        setValues((current) => ({ ...current, [field.key]: nextValue ?? "" }))
                      }
                    >
                      <SelectTrigger id={`task-field-${field.key}`} className="w-full">
                        <SelectValue placeholder={`选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`task-field-${field.key}`}
                      type={field.type === "number" ? "number" : "text"}
                      step={field.type === "number" ? "any" : undefined}
                      value={textValue}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                    />
                  )}
                </div>
              );
            })
          )}
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" disabled={submitting} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
