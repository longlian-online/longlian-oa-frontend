import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ProjectCustomField } from "@/lib/projectMetadata";

export interface EditableProjectCustomField extends ProjectCustomField {
  id: string;
}

interface ProjectCustomFieldsEditorProps {
  fields: EditableProjectCustomField[];
  onChange: (fields: EditableProjectCustomField[]) => void;
  disabled?: boolean;
}

export default function ProjectCustomFieldsEditor({
  fields,
  onChange,
  disabled = false,
}: ProjectCustomFieldsEditorProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">自定义字段</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...fields, { id: crypto.randomUUID(), name: "", value: "" }])}
        >
          <Plus data-icon="inline-start" />
          添加字段
        </Button>
      </div>
      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          还没有自定义字段。
        </div>
      ) : (
        <ol className="flex min-w-0 flex-col gap-2" aria-label="自定义字段">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center"
            >
              <Input
                value={field.name}
                disabled={disabled}
                aria-label={`字段 ${index + 1} 名称`}
                placeholder="字段名，例如作者"
                onChange={(event) =>
                  onChange(
                    fields.map((item) =>
                      item.id === field.id ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
              <Input
                value={field.value}
                disabled={disabled}
                aria-label={`字段 ${index + 1} 值`}
                placeholder="字段值"
                onChange={(event) =>
                  onChange(
                    fields.map((item) =>
                      item.id === field.id ? { ...item, value: event.target.value } : item,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={`删除字段 ${index + 1}`}
                onClick={() => onChange(fields.filter((item) => item.id !== field.id))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
