import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TaskMetaFieldType = "text" | "textarea" | "file" | "number" | "select";

export interface TaskMetaField {
  id: string;
  name: string;
  fieldType: TaskMetaFieldType;
  required: boolean;
  options: string[];
}

const FIELD_TYPE_LABELS: Record<TaskMetaFieldType, string> = {
  text: "单行文本",
  textarea: "多行文本",
  file: "文件上传",
  number: "数字",
  select: "下拉选择",
};

interface BaseTaskMetaFieldsEditorProps {
  fields: TaskMetaField[];
  onAdd: () => void;
  onChange: (fieldId: string, patch: Partial<TaskMetaField>) => void;
  onRemove: (fieldId: string) => void;
}

export default function BaseTaskMetaFieldsEditor({
  fields,
  onAdd,
  onChange,
  onRemove,
}: BaseTaskMetaFieldsEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">提交字段（可选）</span>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          新增字段
        </Button>
      </div>
      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          没有额外提交内容，成员可直接完成任务。
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border bg-muted/20 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto] sm:items-center">
                <Input
                  value={field.name}
                  maxLength={100}
                  placeholder={`字段 ${index + 1}，例如译文链接`}
                  onChange={(event) => onChange(field.id, { name: event.target.value })}
                />
                <Select
                  value={field.fieldType}
                  onValueChange={(value: string | null) => {
                    if (value) onChange(field.id, { fieldType: value as TaskMetaFieldType });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap px-1 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={field.required}
                    className="size-4 accent-primary"
                    onChange={(event) => onChange(field.id, { required: event.target.checked })}
                  />
                  必填
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`删除字段 ${index + 1}`}
                  title="删除字段"
                  onClick={() => onRemove(field.id)}
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </div>
              {field.fieldType === "select" && (
                <Input
                  value={field.options.join("、")}
                  placeholder="填写选项，以顿号分隔，例如：通过、需修改"
                  className="mt-2"
                  onChange={(event) =>
                    onChange(field.id, {
                      options: event.target.value
                        .split(/[、,，]/)
                        .map((option) => option.trim())
                        .filter(Boolean),
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
