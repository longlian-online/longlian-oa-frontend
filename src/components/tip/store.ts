import type { ReactNode } from "react";

export type TipType = "success" | "error" | "warning" | "info" | "loading";
export type TipIcon = ReactNode | false;

export interface TipItem {
  id: number;
  message: string;
  type: TipType;
  icon?: TipIcon;
  time: number;
}

export type TipListener = (tip: TipItem) => void;

const listeners = new Set<TipListener>();
const pendingTips: TipItem[] = [];
let nextTipId = 1;

export function showTip(
  message: string,
  type: TipType = "info",
  icon?: TipIcon,
  time = 2400,
): number {
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

export function subscribeTip(listener: TipListener): () => void {
  listeners.add(listener);
  pendingTips.splice(0).forEach(listener);
  return () => {
    listeners.delete(listener);
  };
}
