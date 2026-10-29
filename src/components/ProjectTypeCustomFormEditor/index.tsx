import { ArrowDown, ArrowUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface ProjectTypeCustomFormItem {
  presetFieldId: string;
  name: string;
  required: boolean;
}

interface ProjectTypeCustomFormEditorProps {
  value: ProjectTypeCustomFormItem[];
  presets: Array<{ id: string; name: string }>;
  presetsStatus?: "loading" | "error" | "ready";
  disabled?: boolean;
  onChange: (value: ProjectTypeCustomFormItem[]) => void;
}

export default function ProjectTypeCustomFormEditor({
  value,
  presets,
  presetsStatus = "ready",
  disabled = false,
  onChange,
}: ProjectTypeCustomFormEditorProps) {
  const selected = new Set(value.map((item) => item.presetFieldId));
  const available = presets.filter((preset) => !selected.has(preset.id));

  function addPreset(presetFieldId: string): void {
    const preset = presets.find((item) => item.id === presetFieldId);
    if (!preset || selected.has(preset.id)) return;
    onChange([...value, { presetFieldId: preset.id, name: preset.name, required: false }]);
  }

  function move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">自定义表单</h3>
        <p className="text-xs font-normal text-muted-foreground">
          创建该类型企划时会带上这些字段。必填字段在保存企划时不能为空。
        </p>
      </div>
      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          还没有默认字段。
        </div>
      ) : (
        <ol
          className="flex max-h-60 min-w-0 flex-col gap-2 overflow-y-auto"
          aria-label="默认自定义表单"
        >
          {value.map((item, index) => (
            <li
              key={item.presetFieldId}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2 py-1.5"
            >
              <span className="min-w-0 truncate text-sm text-foreground">{item.name}</span>
              <div className="flex shrink-0 items-center gap-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  必填
                  <Switch
                    size="sm"
                    checked={item.required}
                    disabled={disabled}
                    aria-label={`${item.name}是否必填`}
                    onCheckedChange={(required) =>
                      onChange(
                        value.map((field) =>
                          field.presetFieldId === item.presetFieldId
                            ? { ...field, required }
                            : field,
                        ),
                      )
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`上移字段 ${item.name}`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`下移字段 ${item.name}`}
                  disabled={disabled || index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`移除字段 ${item.name}`}
                  disabled={disabled}
                  onClick={() =>
                    onChange(value.filter((field) => field.presetFieldId !== item.presetFieldId))
                  }
                >
                  <X />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <label className="flex flex-col gap-1.5 text-xs font-medium text-foreground">
        添加预置字段
        <select
          aria-label="添加预置表单字段"
          className="h-9 rounded-lg border border-border/70 bg-muted/20 px-3 text-sm font-normal"
          value=""
          disabled={disabled || presetsStatus !== "ready" || available.length === 0}
          onChange={(event) => {
            if (event.target.value) addPreset(event.target.value);
          }}
        >
          <option value="">
            {presetsStatus === "loading"
              ? "正在加载预置表单字段"
              : presetsStatus === "error"
                ? "暂时无法加载预置表单字段"
                : available.length === 0
                  ? presets.length === 0
                    ? "暂无预置表单字段"
                    : "字段都已加入"
                  : "选择预置字段"}
          </option>
          {available.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
