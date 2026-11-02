import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export interface ProjectTypeCustomFormItem {
  id: string;
  presetFieldId?: string;
  name: string;
  required: boolean;
}

export interface ProjectTypeCustomFormPreset {
  id: string;
  name: string;
}

interface ProjectTypeCustomFormEditorProps {
  value: ProjectTypeCustomFormItem[];
  presets: ProjectTypeCustomFormPreset[];
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
  const usedPresetIds = new Set(
    value.flatMap((item) => (item.presetFieldId ? [item.presetFieldId] : [])),
  );

  function move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">自定义表单</h3>
          <p className="text-xs font-normal text-muted-foreground">
            创建该类型企划时会带上这些字段。可以从预置表单字段选择，也可以自己填写；必填字段在保存企划时不能为空。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onChange([...value, { id: crypto.randomUUID(), name: "", required: false }])
          }
        >
          <Plus data-icon="inline-start" />
          添加字段
        </Button>
      </div>
      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          还没有默认字段。
        </div>
      ) : (
        <ol
          className="flex max-h-60 min-w-0 flex-col gap-2 overflow-y-auto"
          aria-label="默认自定义表单"
        >
          {value.map((item, index) => (
            <FieldRow
              key={item.id}
              item={item}
              index={index}
              presets={presets}
              presetsStatus={presetsStatus}
              usedPresetIds={usedPresetIds}
              isFirst={index === 0}
              isLast={index === value.length - 1}
              disabled={disabled}
              onChange={(next) =>
                onChange(value.map((field) => (field.id === item.id ? next : field)))
              }
              onMove={(direction) => move(index, direction)}
              onRemove={() => onChange(value.filter((field) => field.id !== item.id))}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function placePresetList(anchor: HTMLElement, list: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  list.style.position = "fixed";
  list.style.top = `${rect.bottom + 4}px`;
  list.style.left = `${rect.left}px`;
  list.style.width = `${rect.width}px`;
}

function FloatingPresetList({
  anchor,
  listId,
  children,
}: {
  anchor: HTMLElement | null;
  listId: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!anchor || !list) return;
    const place = () => placePresetList(anchor, list);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, children]);

  return createPortal(
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label="组织预置表单字段"
      className="fixed z-[80] max-h-60 overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      {children}
    </div>,
    document.body,
  );
}

function FieldRow({
  item,
  index,
  presets,
  presetsStatus,
  usedPresetIds,
  isFirst,
  isLast,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  item: ProjectTypeCustomFormItem;
  index: number;
  presets: ProjectTypeCustomFormPreset[];
  presetsStatus: "loading" | "error" | "ready";
  usedPresetIds: Set<string>;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onChange: (item: ProjectTypeCustomFormItem) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  const presetFieldRef = useRef<HTMLDivElement>(null);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const label = item.name.trim() || `字段 ${index + 1}`;
  const presetKeyword = item.name.trim().toLocaleLowerCase();
  const visiblePresets = presets.filter(
    (preset) =>
      (preset.id === item.presetFieldId || !usedPresetIds.has(preset.id)) &&
      fuzzyMatch(preset.name, presetKeyword),
  );
  const emptyPresetMessage =
    presetsStatus === "loading"
      ? "正在加载预置表单字段"
      : presetsStatus === "error"
        ? "暂时无法加载预置表单字段"
        : presets.length === 0
          ? "暂无预置表单字段"
          : "没有可选的字段";

  useEffect(() => {
    if (!presetMenuOpen) return;
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node;
      const inAnchor = presetFieldRef.current?.contains(target);
      const inMenu = document.getElementById(`${inputId}-presets`)?.contains(target);
      if (!inAnchor && !inMenu) setPresetMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [presetMenuOpen, inputId]);

  function handlePickPreset(presetId: string): void {
    const preset = presets.find((entry) => entry.id === presetId);
    if (!preset || disabled) return;
    onChange({ ...item, name: preset.name, presetFieldId: preset.id });
    setPresetMenuOpen(false);
  }

  return (
    <li className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div ref={presetFieldRef} className="relative min-w-0">
        <Input
          value={item.name}
          disabled={disabled}
          maxLength={50}
          aria-label={`字段 ${index + 1} 名称`}
          placeholder="字段名，例如作者"
          aria-autocomplete="list"
          aria-expanded={presetMenuOpen}
          aria-controls={`${inputId}-presets`}
          className="pr-8"
          onChange={(event) =>
            onChange({ ...item, name: event.target.value, presetFieldId: undefined })
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") setPresetMenuOpen(false);
          }}
        />
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
        {presetMenuOpen ? (
          <FloatingPresetList anchor={presetFieldRef.current} listId={`${inputId}-presets`}>
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
          </FloatingPresetList>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1 sm:justify-end">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          必填
          <Switch
            size="sm"
            checked={item.required}
            disabled={disabled}
            aria-label={`${label}是否必填`}
            onCheckedChange={(required) => onChange({ ...item, required })}
          />
        </label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`上移字段 ${label}`}
            disabled={disabled || isFirst}
            onClick={() => onMove(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`下移字段 ${label}`}
            disabled={disabled || isLast}
            onClick={() => onMove(1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`移除字段 ${label}`}
            disabled={disabled}
            onClick={onRemove}
          >
            <X />
          </Button>
        </div>
      </div>
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
