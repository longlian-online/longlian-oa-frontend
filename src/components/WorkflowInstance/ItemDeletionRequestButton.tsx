import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Trash2 } from "lucide-react";

import { createItemDeletionRequest, deleteProjectItem } from "@/api/projectItem";
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
import { useConfirm } from "@/hooks/useConfirm";

interface ItemDeletionRequestButtonProps {
  projectId: string;
  itemId: string;
  itemTitle: string;
  hasSubmittedTask: boolean;
}

export default function ItemDeletionRequestButton({
  projectId,
  itemId,
  itemTitle,
  hasSubmittedTask,
}: ItemDeletionRequestButtonProps) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const actionLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const deleteMutation = useApiMutation({
    mutationFn: () => deleteProjectItem(projectId, itemId),
    invalidate: [
      ["items"],
      ["projects"],
      ["flow"],
      ["instances"],
      ["taskDetail"],
      ["workshop"],
      ["plaza"],
    ],
  });
  const requestMutation = useApiMutation({
    mutationFn: (nextReason: string) => createItemDeletionRequest(projectId, itemId, nextReason),
    invalidate: [["deletionRequests"]],
  });
  const pending = deleteMutation.isPending || requestMutation.isPending;

  async function handleDelete(): Promise<void> {
    if (actionLock.current) return;
    if (hasSubmittedTask) {
      setReason("");
      setOpen(true);
      return;
    }
    const confirmed = await confirm({
      title: "删除项目？",
      description: `删除后「${itemTitle}」的流程与任务记录将不可恢复。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!confirmed || actionLock.current) return;
    actionLock.current = true;
    try {
      await deleteMutation.mutateAsync();
      $tip("项目已删除", "success");
      void navigate(`/dashboard/planning/${projectId}`, { state: location.state });
    } catch {
      // Mutation 的最终失败由共享错误入口提示，保留当前项目。
    } finally {
      actionLock.current = false;
    }
  }

  async function handleSubmit(): Promise<void> {
    const trimmed = reason.trim();
    if (!trimmed || actionLock.current) return;
    actionLock.current = true;
    try {
      await requestMutation.mutateAsync(trimmed);
      setOpen(false);
      $tip("已提交删除申请，请等待组织管理员审核", "success");
    } catch {
      // Mutation 的最终失败由共享错误入口提示，保留当前原因。
    } finally {
      actionLock.current = false;
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="shrink-0"
        disabled={pending}
        onClick={() => void handleDelete()}
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
              disabled={!reason.trim() || pending}
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
