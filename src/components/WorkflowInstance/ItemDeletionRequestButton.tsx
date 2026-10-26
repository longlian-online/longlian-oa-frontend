import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { createItemDeletionRequest } from "@/api/projectItem";
import { $tip } from "@/components/tip";
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
import { useApiMutation } from "@/hooks/queries/useApiQuery";

interface ItemDeletionRequestButtonProps {
  projectId: string;
  itemId: string;
  itemTitle: string;
}

export default function ItemDeletionRequestButton({
  projectId,
  itemId,
  itemTitle,
}: ItemDeletionRequestButtonProps) {
  const requestLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const requestMutation = useApiMutation({
    mutationFn: (nextReason: string) => createItemDeletionRequest(projectId, itemId, nextReason),
    invalidate: [["deletionRequests"]],
  });

  async function handleSubmit(): Promise<void> {
    const trimmed = reason.trim();
    if (!trimmed || requestLock.current) return;
    requestLock.current = true;
    try {
      await requestMutation.mutateAsync(trimmed);
      setOpen(false);
      $tip("已提交删除申请，请等待组织管理员审核", "success");
    } catch {
      // Mutation 的最终失败由共享错误入口提示，保留当前原因。
    } finally {
      requestLock.current = false;
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="shrink-0"
        disabled={requestMutation.isPending}
        onClick={() => {
          setReason("");
          setOpen(true);
        }}
      >
        <Trash2 data-icon="inline-start" />
        删除项目
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除项目？</DialogTitle>
            <DialogDescription>由于项目存在已提交任务，删除需要管理员审核</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            maxLength={500}
            aria-label={`删除${itemTitle}的原因`}
            placeholder="填写删除原因"
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || requestMutation.isPending}
              onClick={() => void handleSubmit()}
            >
              提交申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
