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

import MemberOptionField from "./MemberOptionField";

interface AssignTaskDialogProps {
  taskTitle: string;
  onClose: () => void;
  onConfirm: (assigneeId: string) => Promise<boolean>;
}

export default function AssignTaskDialog({ taskTitle, onClose, onConfirm }: AssignTaskDialogProps) {
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);

  function close(): void {
    if (!lock.current) onClose();
  }

  async function confirm(): Promise<void> {
    if (!selectedId || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setFailed(false);
    try {
      if (await onConfirm(selectedId)) onClose();
      else setFailed(true);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分配任务</DialogTitle>
          <DialogDescription>
            将「{taskTitle}」直接分配给组员。分配后任务归该组员，无需再手动领取。
          </DialogDescription>
        </DialogHeader>
        <MemberOptionField
          id="assign-member"
          listId="assign-member-list"
          value={selectedId}
          onChange={setSelectedId}
        />
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            分配失败，请确认任务仍未接取且组员属于当前组织。
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" disabled={submitting} onClick={close}>
            取消
          </Button>
          <Button disabled={!selectedId || submitting} onClick={() => void confirm()}>
            确认分配
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
