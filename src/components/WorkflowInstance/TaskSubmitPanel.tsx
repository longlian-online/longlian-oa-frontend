import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import FileUpload from "@/components/FileUpload";
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

interface TaskSubmitPanelProps {
  open: boolean;
  taskInstanceId?: string;
  taskName?: string;
  metaSchema?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (metadata: Record<string, unknown>) => Promise<void>;
}

interface MetaFieldSchema {
  name: string;
  fieldType?: "text" | "textarea" | "file" | "number" | "select";
  required?: boolean;
  options?: string[];
}

type FieldValue = string | UploadedFileInfo | null;

function parseMetaSchema(metaSchema?: string): MetaFieldSchema[] {
  if (!metaSchema) return [];

  try {
    const parsed = JSON.parse(metaSchema) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "字段",
        fieldType:
          item.fieldType === "textarea" ||
          item.fieldType === "file" ||
          item.fieldType === "number" ||
          item.fieldType === "select"
            ? item.fieldType
            : "text",
        required: item.required === true,
        options: Array.isArray(item.options)
          ? item.options.filter((option): option is string => typeof option === "string")
          : [],
      }));
  } catch {
    return [];
  }
}

export default function TaskSubmitPanel({
  open,
  taskInstanceId,
  taskName = "",
  metaSchema,
  onOpenChange,
  onSubmit,
}: TaskSubmitPanelProps) {
  const fields = useMemo(() => parseMetaSchema(metaSchema), [metaSchema]);
  const [formData, setFormData] = useState<Record<string, FieldValue>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    try {
      setSubmitting(true);
      await onSubmit({ values: formData });
      setFormData({});
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>提交任务{taskName ? `：${taskName}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {fields.length === 0 ? (
            <div className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              该任务没有额外提交字段，确认后会直接提交。
            </div>
          ) : (
            fields.map((field) => (
              <label key={field.name} className="flex flex-col gap-2 text-sm text-foreground">
                <span>
                  {field.name}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </span>
                {field.fieldType === "textarea" ? (
                  <Textarea
                    value={(formData[field.name] as string | undefined) ?? ""}
                    className="min-h-24 resize-none"
                    onChange={(event) =>
                      setFormData({ ...formData, [field.name]: event.target.value })
                    }
                  />
                ) : field.fieldType === "file" ? (
                  <FileUpload
                    bizType="task_submit"
                    bizId={taskInstanceId ?? taskName}
                    value={(formData[field.name] as UploadedFileInfo | undefined) ?? null}
                    title={`上传${field.name}`}
                    description="支持图片、文档或压缩包"
                    onChange={(file) => setFormData({ ...formData, [field.name]: file })}
                  />
                ) : field.fieldType === "select" ? (
                  <Select
                    value={(formData[field.name] as string | undefined) ?? ""}
                    onValueChange={(value: string | null) =>
                      setFormData({ ...formData, [field.name]: value || "" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`选择${field.name}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.fieldType === "number" ? "number" : "text"}
                    value={(formData[field.name] as string | undefined) ?? ""}
                    onChange={(event) =>
                      setFormData({ ...formData, [field.name]: event.target.value })
                    }
                  />
                )}
              </label>
            ))
          )}
        </div>

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
