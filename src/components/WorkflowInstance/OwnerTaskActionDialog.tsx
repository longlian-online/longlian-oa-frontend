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
import { Textarea } from "@/components/ui/textarea";
import type { ItemTaskInstanceVO } from "@/types/workflowInstance";
import type { OwnerTaskAction } from "./taskPermissions";

interface OwnerTaskActionDialogProps {
  action: OwnerTaskAction;
  instance: ItemTaskInstanceVO;
  taskTitle: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<boolean>;
}

export default function OwnerTaskActionDialog({
  action,
  instance,
  taskTitle,
  onClose,
  onConfirm,
}: OwnerTaskActionDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const trimmed = reason.trim();
  const valid = trimmed.length > 0 && trimmed.length <= 500;
  const label = action === "cancel" ? "取消接取" : "负责人打回";

  function close(): void {
    if (!lock.current) onClose();
  }

  async function confirm(): Promise<void> {
    if (lock.current || !valid) return;
    lock.current = true;
    setSubmitting(true);
    setFailed(false);
    try {
      const succeeded = await onConfirm(trimmed);
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
          <DialogTitle>
            {label}：{taskTitle}
          </DialogTitle>
          <DialogDescription>
            当前执行人：{instance.assigneeNickname || instance.assigneeId || "未知成员"}。
            {action === "cancel"
              ? "任务将回到待接取并清除当前执行人，成员仍保留在企划中。"
              : "当前提交将标为已打回，任务回到待提交，原执行人需重新提交。"}
            成果历史与操作记录保留；不会回滚其他任务，后续仅接取的任务保持不变。
          </DialogDescription>
        </DialogHeader>
        <label htmlFor="owner-task-reason" className="text-sm font-medium">
          操作原因（必填）
        </label>
        <Textarea
          id="owner-task-reason"
          value={reason}
          disabled={submitting}
          aria-invalid={trimmed.length > 500}
          aria-describedby="owner-task-reason-help"
          placeholder="请输入操作原因，1–500 字"
          className="min-h-28 resize-none"
          onChange={(event) => setReason(event.target.value)}
        />
        <p id="owner-task-reason-help" className="text-xs text-muted-foreground">
          去除首尾空白后 {trimmed.length}/500 字
          {trimmed.length > 500 ? "，原因不能超过 500 字" : ""}
        </p>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            操作未完成，原因已保留。请查看错误提示；若任务已变更，请取消并刷新后重新操作。
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" disabled={submitting} onClick={close}>
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={!valid || submitting}
            onClick={() => void confirm()}
          >
            {submitting ? "处理中…" : `确认${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
