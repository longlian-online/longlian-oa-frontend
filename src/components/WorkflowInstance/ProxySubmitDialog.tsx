import { useState } from "react";

import DateTimeField from "@/components/DateTimeField";
import type { TaskFormField } from "@/types/task";
import type { TaskProxySubmitDTO } from "@/types/workflowInstance";

import MemberOptionField from "./MemberOptionField";
import TaskSubmitPanel from "./TaskSubmitPanel";
import { toDateTimeLocalValue, toSubmitTimestamp } from "./proxySubmitTime";

interface ProxySubmitDialogProps {
  taskInstanceId: string;
  taskName: string;
  expectedRevision: string;
  submitFields: TaskFormField[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (submission: TaskProxySubmitDTO) => Promise<boolean>;
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
  const [submittedAt, setSubmittedAt] = useState(() => toDateTimeLocalValue(new Date()));
  const timestamp = toSubmitTimestamp(submittedAt);
  const ready = Boolean(assigneeId && timestamp);

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
          <MemberOptionField
            id="proxy-submit-member"
            listId="proxy-submit-member-list"
            value={assigneeId}
            onChange={setAssigneeId}
          />
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <label htmlFor="proxy-submit-time">提交时间</label>
            <DateTimeField
              id="proxy-submit-time"
              mode="datetime"
              max={toDateTimeLocalValue(new Date())}
              value={submittedAt}
              onChange={setSubmittedAt}
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
