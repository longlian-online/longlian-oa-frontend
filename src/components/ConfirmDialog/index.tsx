import { createContext, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmDialogRequest extends Required<ConfirmDialogOptions> {
  id: number;
  resolve: (confirmed: boolean) => void;
}

export type ConfirmDialogContextValue = (options?: ConfirmDialogOptions) => Promise<boolean>;

export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

let nextConfirmId = 1;

const DEFAULT_OPTIONS: Required<ConfirmDialogOptions> = {
  title: "确认操作",
  description: "该操作执行后可能无法撤销，请确认是否继续。",
  confirmText: "确认",
  cancelText: "取消",
  variant: "default",
};

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [currentRequest, setCurrentRequest] = useState<ConfirmDialogRequest | null>(null);

  const confirm = useCallback<ConfirmDialogContextValue>((options) => {
    return new Promise<boolean>((resolve) => {
      setCurrentRequest({
        ...DEFAULT_OPTIONS,
        ...options,
        id: nextConfirmId,
        resolve,
      });
      nextConfirmId += 1;
    });
  }, []);

  const contextValue = useMemo(() => confirm, [confirm]);

  const handleClose = (confirmed: boolean): void => {
    if (!currentRequest) return;
    currentRequest.resolve(confirmed);
    setCurrentRequest(null);
  };

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      <Dialog open={!!currentRequest} onOpenChange={(open) => !open && handleClose(false)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <DialogTitle>{currentRequest?.title}</DialogTitle>
            <DialogDescription>{currentRequest?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {currentRequest?.cancelText}
            </Button>
            <Button
              variant={currentRequest?.variant === "destructive" ? "destructive" : "default"}
              onClick={() => handleClose(true)}
            >
              {currentRequest?.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}
