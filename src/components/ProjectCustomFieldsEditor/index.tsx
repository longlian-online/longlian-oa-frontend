import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { missingRequiredFieldNames } from "@/lib/projectMetadata";

import type { EditableProjectCustomField } from "@/lib/projectMetadata";

export type { EditableProjectCustomField };

export interface PresetCustomFieldOption {
  id: string;
  name: string;
}

interface ProjectCustomFieldsEditorProps {
  fields: EditableProjectCustomField[];
  onChange: (fields: EditableProjectCustomField[]) => void;
  presets?: PresetCustomFieldOption[];
  presetsStatus?: "loading" | "error" | "ready";
  showErrors?: boolean;
  disabled?: boolean;
}

export default function ProjectCustomFieldsEditor({
  fields,
  onChange,
  presets = [],
  presetsStatus = "ready",
  showErrors = false,
  disabled = false,
}: ProjectCustomFieldsEditorProps) {
  const missing = new Set(missingRequiredFieldNames(fields));

  return (
    <section className="flex min-w-0 flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-foreground">自定义字段</h2>
          <p className="text-xs text-muted-foreground">可以从预置表单字段选择，也可以自己填写。</p>
        </div>
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
            <FieldRow
              key={field.id}
              field={field}
              index={index}
              presets={presets}
              presetsStatus={presetsStatus}
              invalid={showErrors && missing.has(field.name.trim())}
              disabled={disabled}
              onChange={(next) =>
                onChange(fields.map((item) => (item.id === field.id ? next : item)))
              }
              onRemove={() => onChange(fields.filter((item) => item.id !== field.id))}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function FieldRow({
  field,
  index,
  presets,
  presetsStatus,
  invalid,
  disabled,
  onChange,
  onRemove,
}: {
  field: EditableProjectCustomField;
  index: number;
  presets: PresetCustomFieldOption[];
  presetsStatus: "loading" | "error" | "ready";
  invalid: boolean;
  disabled: boolean;
  onChange: (field: EditableProjectCustomField) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  const presetFieldRef = useRef<HTMLDivElement>(null);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const locked = Boolean(field.required);
  const presetKeyword = field.name.trim().toLocaleLowerCase();
  const visiblePresets = presets.filter((preset) => fuzzyMatch(preset.name, presetKeyword));
  const emptyPresetMessage =
    presetsStatus === "loading"
      ? "正在加载预置表单字段"
      : presetsStatus === "error"
        ? "暂时无法加载预置表单字段"
        : presets.length === 0
          ? "暂无预置表单字段"
          : "没有匹配的字段";

  useEffect(() => {
    if (!presetMenuOpen) return;
    function handlePointerDown(event: PointerEvent): void {
      if (!presetFieldRef.current?.contains(event.target as Node)) setPresetMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [presetMenuOpen]);

  function handlePickPreset(presetId: string): void {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset || disabled || locked) return;
    onChange({ ...field, name: preset.name });
    setPresetMenuOpen(false);
  }

  return (
    <li className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center">
      <div ref={presetFieldRef} className="relative min-w-0">
        <Input
          value={field.name}
          readOnly={locked}
          disabled={disabled}
          aria-label={`字段 ${index + 1} 名称`}
          placeholder="字段名，例如作者"
          aria-autocomplete="list"
          aria-expanded={presetMenuOpen}
          aria-controls={`${inputId}-presets`}
          className={locked ? "pr-2" : "pr-8"}
          onChange={(event) => onChange({ ...field, name: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Escape") setPresetMenuOpen(false);
          }}
        />
        {locked ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`选择字段 ${index + 1} 的预置表单字段`}
            aria-expanded={presetMenuOpen}
            aria-controls={`${inputId}-presets`}
            title={presetsStatus === "loading" ? "正在加载预置表单字段" : "选择预置表单字段"}
            disabled={disabled}
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setPresetMenuOpen((open) => !open)}
          >
            <ChevronDown />
          </Button>
        )}
        {presetMenuOpen && !locked ? (
          <div
            id={`${inputId}-presets`}
            role="listbox"
            aria-label="组织预置表单字段"
            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            {visiblePresets.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyPresetMessage}</div>
            ) : (
              visiblePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="option"
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handlePickPreset(preset.id)}
                >
                  {preset.name}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <Input
        value={field.value}
        disabled={disabled}
        aria-label={`字段 ${index + 1} 值`}
        aria-invalid={invalid}
        aria-required={locked}
        placeholder={locked ? "必填" : "字段值"}
        onChange={(event) => onChange({ ...field, value: event.target.value })}
      />
      {locked ? (
        <span className="px-2 text-xs text-muted-foreground">必填</span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={`删除字段 ${index + 1}`}
          onClick={onRemove}
        >
          <X />
        </Button>
      )}
    </li>
  );
}

function fuzzyMatch(name: string, keyword: string): boolean {
  if (!keyword) return true;
  const source = name.toLocaleLowerCase();
  let index = 0;
  for (const char of keyword) {
    index = source.indexOf(char, index);
    if (index < 0) return false;
    index += 1;
  }
  return true;
}
