import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Tags, X } from "lucide-react";

import ProjectMetadataTag, {
  PROJECT_METADATA_TAG_COLOR_LABELS,
} from "@/components/ProjectMetadataTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROJECT_METADATA_TAG_COLORS,
  normalizeProjectMetadataTagColor,
} from "@/lib/projectMetadata";
import type {
  ProjectMetadataTag as MetadataTag,
  ProjectMetadataTagColor,
} from "@/lib/projectMetadata";

export interface EditableProjectMetadataTag extends MetadataTag {
  id: string;
}

export interface ProjectMetadataPresetTag {
  id: string;
  name: string;
  color?: ProjectMetadataTagColor;
}

export type ProjectMetadataPresetStatus = "loading" | "error" | "ready";

interface ProjectMetadataEditorProps {
  tags: EditableProjectMetadataTag[];
  draft: MetadataTag;
  onTagsChange: (tags: EditableProjectMetadataTag[]) => void;
  onDraftChange: (draft: MetadataTag) => void;
  disabled?: boolean;
  presets?: readonly ProjectMetadataPresetTag[];
  presetsStatus?: ProjectMetadataPresetStatus;
}

interface TagColorSelectProps {
  color: ProjectMetadataTagColor | undefined;
  label: string;
  onChange: (color: ProjectMetadataTagColor | undefined) => void;
  disabled: boolean;
}

function TagColorSelect({ color, label, onChange, disabled }: TagColorSelectProps) {
  return (
    <Select
      value={color ?? "default"}
      onValueChange={(value: string | null) => onChange(normalizeProjectMetadataTagColor(value))}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="w-24 shrink-0" aria-label={label}>
        <SelectValue>{color ? PROJECT_METADATA_TAG_COLOR_LABELS[color] : "默认颜色"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="default">默认颜色</SelectItem>
          {PROJECT_METADATA_TAG_COLORS.map((value) => (
            <SelectItem key={value} value={value}>
              {PROJECT_METADATA_TAG_COLOR_LABELS[value]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
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

export default function ProjectMetadataEditor({
  tags,
  draft,
  onTagsChange,
  onDraftChange,
  disabled = false,
  presets = [],
  presetsStatus = "ready",
}: ProjectMetadataEditorProps) {
  const [showInput, setShowInput] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const presetFieldRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const missingKey = Boolean(draft.value.trim() && !draft.key.trim());

  function handleAddTag(): void {
    const key = draft.key.trim();
    if (!key || disabled) return;
    onTagsChange([
      ...tags,
      { id: crypto.randomUUID(), key, value: draft.value.trim(), color: draft.color },
    ]);
    onDraftChange({ key: "", value: "" });
    setPresetMenuOpen(false);
    setShowInput(false);
  }

  function closeInput(): void {
    onDraftChange({ key: "", value: "" });
    setPresetMenuOpen(false);
    setShowInput(false);
  }

  function handlePickPreset(presetId: string): void {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset || disabled) return;
    onDraftChange({
      ...draft,
      key: preset.name,
      color: normalizeProjectMetadataTagColor(preset.color),
    });
    setPresetMenuOpen(false);
  }

  const presetKeyword = draft.key.trim().toLocaleLowerCase();
  const visiblePresets = presets.filter((preset) => fuzzyMatch(preset.name, presetKeyword));
  const emptyPresetMessage =
    presetsStatus === "loading"
      ? "正在加载预制标签"
      : presetsStatus === "error"
        ? "暂时无法加载预制标签"
        : presets.length === 0
          ? "暂无预制标签"
          : "没有匹配的标签";

  useEffect(() => {
    if (!presetMenuOpen) return;
    function handlePointerDown(event: PointerEvent): void {
      if (!presetFieldRef.current?.contains(event.target as Node)) setPresetMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [presetMenuOpen]);

  function handleMoveTag(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    if (disabled || targetIndex < 0 || targetIndex >= tags.length) return;
    const next = [...tags];
    [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
    onTagsChange(next);
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 border-b py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tags className="size-4 text-muted-foreground" />
          <h2 className="text-base font-medium text-foreground">标签</h2>
        </div>
        {!showInput && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setShowInput(true)}
          >
            <Plus data-icon="inline-start" />
            添加标签
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        值可留空作为纯标签。列表展示前两个标签，可通过上下移动调整优先顺序。
      </p>
      {tags.length > 0 && (
        <ol className="flex min-w-0 flex-col gap-2" aria-label="标签列表">
          {tags.map((tag, index) => (
            <li
              key={tag.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-2"
            >
              <div className="min-w-0 max-w-full flex-1 basis-40">
                <ProjectMetadataTag tag={tag} />
              </div>
              <div className="flex max-w-full items-center gap-1">
                <TagColorSelect
                  color={tag.color}
                  label={`标签 ${index + 1} ${tag.key} 的颜色`}
                  disabled={disabled}
                  onChange={(color) =>
                    onTagsChange(
                      tags.map((item) => (item.id === tag.id ? { ...item, color } : item)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="上移"
                  aria-label={`上移标签 ${index + 1} ${tag.key}`}
                  disabled={disabled || index === 0}
                  onClick={() => handleMoveTag(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="下移"
                  aria-label={`下移标签 ${index + 1} ${tag.key}`}
                  disabled={disabled || index === tags.length - 1}
                  onClick={() => handleMoveTag(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="删除"
                  aria-label={`删除标签 ${index + 1} ${tag.key}`}
                  disabled={disabled}
                  onClick={() => onTagsChange(tags.filter((item) => item.id !== tag.id))}
                >
                  <X />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {showInput && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={`${inputId}-key`} className="text-xs font-medium">
                标签名
              </label>
              <div ref={presetFieldRef} className="relative">
                <Input
                  id={`${inputId}-key`}
                  placeholder="标签名"
                  value={draft.key}
                  disabled={disabled}
                  aria-invalid={missingKey}
                  aria-autocomplete="list"
                  aria-expanded={presetMenuOpen}
                  aria-controls={`${inputId}-presets`}
                  aria-describedby={missingKey ? `${inputId}-error` : undefined}
                  className="pr-8"
                  onChange={(event) => {
                    onDraftChange({ ...draft, key: event.target.value });
                    if (!disabled) setPresetMenuOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setPresetMenuOpen(false);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="选择预制标签"
                  aria-expanded={presetMenuOpen}
                  aria-controls={`${inputId}-presets`}
                  title={presetsStatus === "loading" ? "正在加载预制标签" : "选择预制标签"}
                  disabled={disabled}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  onClick={() => setPresetMenuOpen((open) => !open)}
                >
                  <ChevronDown />
                </Button>
                {presetMenuOpen && (
                  <div
                    id={`${inputId}-presets`}
                    role="listbox"
                    aria-label="组织预制标签"
                    className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
                  >
                    {visiblePresets.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {emptyPresetMessage}
                      </div>
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
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={`${inputId}-value`} className="text-xs font-medium">
                值（选填）
              </label>
              <Input
                id={`${inputId}-value`}
                placeholder="值（选填）"
                value={draft.value}
                disabled={disabled}
                onChange={(event) => onDraftChange({ ...draft, value: event.target.value })}
              />
            </div>
          </div>
          {missingKey && (
            <p id={`${inputId}-error`} className="text-xs text-destructive" role="alert">
              请填写标签名
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <TagColorSelect
              color={draft.color}
              label="新标签颜色"
              disabled={disabled}
              onChange={(color) => onDraftChange({ ...draft, color })}
            />
            {draft.key.trim() && (
              <ProjectMetadataTag
                tag={{ ...draft, key: draft.key.trim(), value: draft.value.trim() }}
              />
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || !draft.key.trim()}
                onClick={handleAddTag}
              >
                添加
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={closeInput}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
