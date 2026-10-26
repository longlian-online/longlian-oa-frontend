import { useMemo, useRef, useState } from "react";

import { getAssignableMembers } from "@/api/workflowInstance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import type { AssignableMemberVO } from "@/types/workflowInstance";

interface AssignTaskDialogProps {
  taskTitle: string;
  onClose: () => void;
  onConfirm: (assigneeId: string) => Promise<boolean>;
}

export default function AssignTaskDialog({ taskTitle, onClose, onConfirm }: AssignTaskDialogProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const membersQuery = useApiQuery({
    key: ["taskAssignees"],
    queryFn: getAssignableMembers,
  });
  const members = useMemo(
    () => (membersQuery.data ?? []).filter((member) => matches(member, keyword)),
    [keyword, membersQuery.data],
  );

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
        <label className="block text-sm">
          <span className="text-muted-foreground">搜索组员</span>
          <input
            value={keyword}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            placeholder="昵称或用户名"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {membersQuery.isLoading && <p className="text-sm text-muted-foreground">正在加载组员</p>}
          {membersQuery.isError && (
            <p role="alert" className="text-sm text-destructive">
              组员列表加载失败
            </p>
          )}
          {!membersQuery.isLoading && members.length === 0 && (
            <p className="text-sm text-muted-foreground">没有可分配的启用组员</p>
          )}
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted data-[selected=true]:bg-muted"
              data-selected={selectedId === member.userId}
              onClick={() => setSelectedId(member.userId)}
            >
              <span>{member.nickname || member.username || member.userId}</span>
              <span className="text-xs text-muted-foreground">{member.username}</span>
            </button>
          ))}
        </div>
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

function matches(member: AssignableMemberVO, keyword: string): boolean {
  const query = keyword.trim().toLowerCase();
  if (!query) return true;
  return [member.nickname, member.username, member.userId].some((value) =>
    value?.toLowerCase().includes(query),
  );
}
