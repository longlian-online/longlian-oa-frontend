import { useState } from "react";

import { listProxySubmitCandidates } from "@/api/workflowInstance";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import TaskSubmitPanel from "./TaskSubmitPanel";
import { toDateTimeLocalValue, toSubmitTimestamp } from "./proxySubmitTime";
import type { TaskFormField } from "@/types/task";
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
  const candidatesQuery = useApiQuery({
    key: ["proxySubmitCandidates", taskInstanceId],
    queryFn: () => listProxySubmitCandidates(taskInstanceId),
    staleTime: 0,
  });
  const candidates = candidatesQuery.data ?? [];
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
            {candidatesQuery.isLoading ? (
              <p className="text-muted-foreground">正在加载组员...</p>
            ) : candidatesQuery.isError ? (
              <p role="alert" className="text-destructive">
                组员列表加载失败
              </p>
            ) : candidates.length === 0 ? (
              <p className="text-muted-foreground">当前企划没有可代提交的组员</p>
            ) : (
              <Select
                value={assigneeId}
                onValueChange={(value: string | null) => setAssigneeId(value ?? "")}
              >
                <SelectTrigger id="proxy-submit-member" className="w-full">
                  <SelectValue placeholder="选择组员" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.userId} value={candidate.userId}>
                      {candidate.nickname || "未命名组员"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
