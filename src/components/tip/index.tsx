import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type TipType = "success" | "error" | "warning" | "info" | "loading";
export type TipIcon = ReactNode | false;

interface TipItem {
  id: number;
  message: string;
  type: TipType;
  icon?: TipIcon;
  time: number;
}

type TipListener = (tip: TipItem) => void;

const listeners = new Set<TipListener>();
const pendingTips: TipItem[] = [];
let nextTipId = 1;

const typeClassName: Record<TipType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-950/5",
  error: "border-red-200 bg-red-50 text-red-950 shadow-red-950/5",
  warning: "border-amber-200 bg-amber-50 text-amber-950 shadow-amber-950/5",
  info: "border-sky-200 bg-sky-50 text-sky-950 shadow-sky-950/5",
  loading: "border-slate-200 bg-white text-slate-950 shadow-slate-950/5",
};

const defaultIcon: Record<TipType, ReactNode> = {
  success: <CheckCircle2 className="size-4 text-emerald-600" />,
  error: <XCircle className="size-4 text-red-600" />,
  warning: <AlertCircle className="size-4 text-amber-600" />,
  info: <Info className="size-4 text-sky-600" />,
  loading: <LoaderCircle className="size-4 animate-spin text-slate-600" />,
};

export function $tip(message: string, type: TipType = "info", icon?: TipIcon, time = 2400): number {
  const tip: TipItem = {
    id: nextTipId,
    message,
    type,
    icon,
    time,
  };
  nextTipId += 1;

  if (listeners.size === 0) {
    pendingTips.push(tip);
    return tip.id;
  }

  listeners.forEach((listener) => listener(tip));
  return tip.id;
}

declare global {
  interface Window {
    $tip: typeof $tip;
  }
}

if (typeof window !== "undefined") {
  window.$tip = $tip;
}

export default function TipProvider() {
  const [tips, setTips] = useState<TipItem[]>([]);

  useEffect(() => {
    const addTip: TipListener = (tip) => {
      setTips((currentTips) => [...currentTips, tip]);

      if (tip.time > 0) {
        window.setTimeout(() => {
          setTips((currentTips) => currentTips.filter((item) => item.id !== tip.id));
        }, tip.time);
      }
    };

    listeners.add(addTip);
    pendingTips.splice(0).forEach(addTip);

    return () => {
      listeners.delete(addTip);
    };
  }, []);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-5 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2">
      {tips.map((tip) => {
        const icon = tip.icon === false ? null : (tip.icon ?? defaultIcon[tip.type]);

        return (
          <div
            key={tip.id}
            role="status"
            className={cn(
              "pointer-events-auto flex min-h-10 max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-lg backdrop-blur",
              typeClassName[tip.type],
            )}
          >
            {icon}
            <span className="truncate">{tip.message}</span>
            <button
              type="button"
              aria-label="关闭提示"
              className="ml-1 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
              onClick={() =>
                setTips((currentTips) => currentTips.filter((item) => item.id !== tip.id))
              }
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
