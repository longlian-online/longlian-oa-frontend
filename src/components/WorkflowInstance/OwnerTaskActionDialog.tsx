import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ItemTaskInstanceVO } from "@/types/workflowInstance";

interface OwnerTaskActionDialogProps {
  instance: ItemTaskInstanceVO;
  taskTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export default function OwnerTaskActionDialog({
  instance,
  taskTitle,
  onClose,
  onConfirm,
}: OwnerTaskActionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);

  function close(): void {
    if (!lock.current) onClose();
  }

  async function confirm(): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setFailed(false);
    try {
      const succeeded = await onConfirm();
      if (succeeded) onClose();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>取消接取：{taskTitle}</DialogTitle>
          <DialogDescription>
            当前执行人：{instance.assigneeNickname || instance.assigneeId || "未知成员"}。
          </DialogDescription>
        </DialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            操作未完成，请查看错误提示；若任务已变更，请取消并刷新后重新操作。
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" disabled={submitting} onClick={close}>
            取消
          </Button>
          <Button variant="destructive" disabled={submitting} onClick={() => void confirm()}>
            {submitting ? "处理中…" : "确认取消接取"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
