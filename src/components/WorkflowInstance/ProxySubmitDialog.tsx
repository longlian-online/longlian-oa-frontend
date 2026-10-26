import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { listMemberOptions } from "@/api/member";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { Input } from "@/components/ui/input";

import TaskSubmitPanel from "./TaskSubmitPanel";
import { toDateTimeLocalValue, toSubmitTimestamp } from "./proxySubmitTime";
import type { TaskFormField } from "@/types/task";
import type { MemberOption } from "@/types/member";
import type { TaskProxySubmitDTO } from "@/types/workflowInstance";

interface ProxySubmitDialogProps {
  taskInstanceId: string;
  taskName: string;
  expectedRevision: string;
  submitFields: TaskFormField[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (submission: TaskProxySubmitDTO) => Promise<boolean>;
}

function memberLabel(member: MemberOption): string {
  return member.nickname || "未命名组员";
}

function placeMemberList(anchor: HTMLElement, list: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  list.style.position = "fixed";
  list.style.top = `${rect.bottom + 4}px`;
  list.style.left = `${rect.left}px`;
  list.style.width = `${rect.width}px`;
}

function FloatingMemberList({
  anchor,
  children,
}: {
  anchor: HTMLInputElement | null;
  children: React.ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!anchor || !list) return;
    const place = () => placeMemberList(anchor, list);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, children]);

  return createPortal(
    <div
      ref={listRef}
      id="proxy-submit-member-list"
      role="listbox"
      aria-label="组员"
      className="fixed z-[80] max-h-60 overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      {children}
    </div>,
    document.body,
  );
}

export default function ProxySubmitDialog({
  taskInstanceId,
  taskName,
  expectedRevision,
  submitFields,
  submitting,
  onClose,
  onSubmit,
}: ProxySubmitDialogProps) {
  const [assigneeId, setAssigneeId] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberListOpen, setMemberListOpen] = useState(false);
  const memberInputRef = useRef<HTMLInputElement>(null);
  const membersQuery = useApiQuery({
    key: ["memberOptions"],
    queryFn: () => listMemberOptions(),
    staleTime: 0,
  });
  const candidates = membersQuery.data ?? [];
  const selectedMember = candidates.find((candidate) => candidate.userId === assigneeId) ?? null;
  const normalizedQuery = memberQuery.trim().toLocaleLowerCase();
  const visibleMembers = candidates.filter((candidate) =>
    memberLabel(candidate).toLocaleLowerCase().includes(normalizedQuery),
  );
  const timestamp = toSubmitTimestamp(submittedAt);
  const ready = Boolean(assigneeId && timestamp && candidates.length > 0);

  return (
    <TaskSubmitPanel
      open
      taskInstanceId={taskInstanceId}
      taskName={taskName}
      submitFields={submitFields}
      submitting={submitting}
      title={`代提交：${taskName}`}
      confirmLabel="确认代提交"
      extraValid={ready}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onSubmit={(submission) => {
        if (!timestamp || !assigneeId) return Promise.resolve(false);
        return onSubmit({
          assigneeId,
          submittedAt: timestamp,
          expectedRevision,
          values: submission.values,
        });
      }}
      extra={
        <>
          <p className="text-sm text-muted-foreground">
            记录归所选组员，提交时间使用这里设定的时间，而不是当前时间。
          </p>
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <label htmlFor="proxy-submit-member">组员</label>
            {membersQuery.isLoading ? (
              <p className="text-muted-foreground">正在加载组员...</p>
            ) : membersQuery.isError ? (
              <p role="alert" className="text-destructive">
                组员列表加载失败
              </p>
            ) : candidates.length === 0 ? (
              <p className="text-muted-foreground">当前组织没有可选组员</p>
            ) : (
              <div>
                <Input
                  ref={memberInputRef}
                  id="proxy-submit-member"
                  role="combobox"
                  aria-expanded={memberListOpen}
                  aria-controls="proxy-submit-member-list"
                  aria-autocomplete="list"
                  placeholder="搜索组员昵称"
                  value={
                    memberListOpen ? memberQuery : selectedMember ? memberLabel(selectedMember) : ""
                  }
                  onFocus={() => {
                    setMemberListOpen(true);
                    setMemberQuery("");
                  }}
                  onClick={() => setMemberListOpen(true)}
                  onChange={(event) => {
                    setMemberQuery(event.target.value);
                    setMemberListOpen(true);
                  }}
                  onBlur={() => setMemberListOpen(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setMemberListOpen(false);
                  }}
                />
                {memberListOpen && (
                  <FloatingMemberList anchor={memberInputRef.current}>
                    {visibleMembers.length === 0 ? (
                      <p className="px-2 py-1.5 text-sm text-muted-foreground">没有匹配的组员</p>
                    ) : (
                      visibleMembers.map((member) => (
                        <button
                          key={member.userId}
                          type="button"
                          role="option"
                          aria-selected={member.userId === assigneeId}
                          className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setAssigneeId(member.userId);
                            setMemberQuery("");
                            setMemberListOpen(false);
                          }}
                        >
                          {memberLabel(member)}
                        </button>
                      ))
                    )}
                  </FloatingMemberList>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <label htmlFor="proxy-submit-time">提交时间</label>
            <Input
              id="proxy-submit-time"
              type="datetime-local"
              max={toDateTimeLocalValue(new Date())}
              value={submittedAt}
              onChange={(event) => setSubmittedAt(event.target.value)}
            />
            {submittedAt && !timestamp && (
              <p role="alert" className="text-destructive">
                提交时间不能晚于当前时间
              </p>
            )}
          </div>
        </>
      }
    />
  );
}
