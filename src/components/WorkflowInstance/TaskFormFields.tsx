import type { ReactElement } from "react";

import FileUpload from "@/components/FileUpload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskFormField, TaskSubmitValue } from "@/types/task";
import type { UploadedFileInfo } from "@/types/file";

interface TaskFormFieldsProps {
  taskInstanceId: string;
  submitFields: TaskFormField[];
  values: Record<string, TaskSubmitValue>;
  uploads: Record<string, UploadedFileInfo | null>;
  disabled: boolean;
  onValueChange: (fieldKey: string, value: TaskSubmitValue) => void;
  onFileChange: (fieldKey: string, file: UploadedFileInfo | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onPreviewFile?: (key: string) => void;
  persistedFileIds?: string[];
}

export default function TaskFormFields({
  taskInstanceId,
  submitFields,
  values,
  uploads,
  disabled,
  onValueChange,
  onFileChange,
  onUploadingChange,
  onPreviewFile,
  persistedFileIds = [],
}: TaskFormFieldsProps): ReactElement {
  return (
    <div className="space-y-3">
      {submitFields.length === 0 ? (
        <div className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
          该任务没有额外提交字段。
        </div>
      ) : (
        submitFields.map((field) => {
          const value = values[field.key];
          const textValue = typeof value === "string" ? value : "";
          const uploadedFile = uploads[field.key];
          return (
            <div key={field.key} className="flex min-w-0 flex-col gap-2 text-sm text-foreground">
              <label htmlFor={`task-field-${field.key}`}>
                {field.label}
                {field.required && <span className="ml-1 text-destructive">*</span>}
              </label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`task-field-${field.key}`}
                  value={textValue}
                  className="min-h-24 resize-none"
                  onChange={(event) => onValueChange(field.key, event.target.value)}
                />
              ) : field.type === "file" ? (
                <FileUpload
                  disabled={disabled}
                  onUploadingChange={onUploadingChange}
                  onPreview={
                    onPreviewFile && uploadedFile && persistedFileIds.includes(uploadedFile.fileId)
                      ? () => onPreviewFile(field.key)
                      : undefined
                  }
                  bizType="task_submit"
                  bizId={taskInstanceId}
                  value={uploadedFile ?? null}
                  title={`${uploadedFile ? "替换" : "上传"}${field.label}`}
                  description="图片、文档、视频和音频不超过 50MB，压缩包不超过 500MB"
                  onChange={(file) => {
                    if (disabled) return;
                    onFileChange(field.key, file);
                  }}
                />
              ) : field.type === "select" ? (
                <Select
                  disabled={disabled}
                  value={textValue}
                  onValueChange={(nextValue: string | null) =>
                    onValueChange(field.key, nextValue ?? "")
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
                  onChange={(event) => onValueChange(field.key, event.target.value)}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
