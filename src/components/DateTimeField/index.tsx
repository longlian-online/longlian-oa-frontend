import { useLayoutEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  currentValue,
  formatDate,
  formatDisplay,
  isDayDisabled,
  isHourDisabled,
  isMinuteDisabled,
  padTime,
  parseDate,
  parseDateTime,
  type DateTimeMode,
} from "./value";

interface DateTimeFieldProps {
  id?: string;
  mode: DateTimeMode;
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);

function TimeColumn({
  label,
  values,
  selected,
  anchor,
  isDisabled,
  onSelect,
}: {
  label: string;
  values: number[];
  selected: number | null;
  anchor: number;
  isDisabled: (value: number) => boolean;
  onSelect: (value: number) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    anchorRef.current?.scrollIntoView({ block: "center" });
  }, [anchor]);

  return (
    <div className="flex w-14 shrink-0 flex-col">
      <div className="py-2 text-center text-xs text-muted-foreground">{label}</div>
      <div className="h-56 overflow-y-auto px-1" role="listbox" aria-label={label}>
        {values.map((item) => {
          const disabled = isDisabled(item);
          return (
            <button
              key={item}
              ref={item === anchor ? anchorRef : undefined}
              type="button"
              role="option"
              aria-selected={item === selected}
              disabled={disabled}
              className="flex h-8 w-full items-center justify-center rounded-md text-sm aria-selected:bg-accent aria-selected:font-medium disabled:opacity-40"
              onClick={() => onSelect(item)}
            >
              {padTime(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateTimeField({
  id,
  mode,
  value,
  min,
  max,
  disabled = false,
  className,
  ariaLabel,
  onChange,
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => new Date());
  const [draftDate, setDraftDate] = useState<Date | undefined>();
  const [draftHour, setDraftHour] = useState<number | null>(null);
  const [draftMinute, setDraftMinute] = useState<number | null>(null);
  const now = new Date();
  const nowAction = currentValue(mode, min, max, now);

  function openPicker(next: boolean): void {
    setOpen(next);
    if (!next) return;
    const parsed = mode === "date" ? parseDate(value) : parseDateTime(value);
    setDraftDate(parsed ?? undefined);
    setDraftHour(parsed && mode === "datetime" ? parsed.getHours() : null);
    setDraftMinute(parsed && mode === "datetime" ? parsed.getMinutes() : null);
    setMonth(parsed ?? new Date());
  }

  function commit(next: string): void {
    onChange(next);
    setOpen(false);
  }

  function selectDay(selected: Date | undefined): void {
    if (!selected) return;
    if (mode === "date") {
      commit(formatDate(selected));
      return;
    }
    setDraftDate(selected);
  }

  const canConfirm =
    mode === "datetime" &&
    draftDate !== undefined &&
    draftHour !== null &&
    draftMinute !== null &&
    !isMinuteDisabled(draftDate, draftHour, draftMinute, mode, min, max);

  return (
    <Popover open={open} onOpenChange={openPicker}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "w-full justify-between px-2.5 font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="truncate">{formatDisplay(value, mode)}</span>
        <CalendarIcon data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex">
          <Calendar
            mode="single"
            locale={zhCN}
            weekStartsOn={1}
            month={month}
            onMonthChange={setMonth}
            selected={draftDate}
            onSelect={selectDay}
            disabled={(day) => isDayDisabled(day, mode, min, max)}
            labels={{
              labelPrevious: () => "上个月",
              labelNext: () => "下个月",
            }}
            formatters={{
              formatCaption: (date) => format(date, "yyyy年M月", { locale: zhCN }),
            }}
          />
          {mode === "datetime" && (
            <div className="flex border-l">
              <TimeColumn
                label="时"
                values={HOURS}
                selected={draftHour}
                anchor={draftHour ?? now.getHours()}
                isDisabled={(hour) => !draftDate || isHourDisabled(draftDate, hour, mode, min, max)}
                onSelect={setDraftHour}
              />
              <TimeColumn
                label="分"
                values={MINUTES}
                selected={draftMinute}
                anchor={draftMinute ?? now.getMinutes()}
                isDisabled={(minute) =>
                  !draftDate ||
                  draftHour === null ||
                  isMinuteDisabled(draftDate, draftHour, minute, mode, min, max)
                }
                onSelect={setDraftMinute}
              />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => commit("")}>
            清空
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!nowAction}
              onClick={() => nowAction && commit(nowAction)}
            >
              {mode === "date" ? "今天" : "此刻"}
            </Button>
            {mode === "datetime" && (
              <Button
                type="button"
                size="sm"
                disabled={!canConfirm}
                onClick={() => {
                  if (!draftDate || draftHour === null || draftMinute === null) return;
                  commit(`${formatDate(draftDate)}T${padTime(draftHour)}:${padTime(draftMinute)}`);
                }}
              >
                确定
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
