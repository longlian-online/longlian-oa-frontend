import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";

import { ApiError } from "@/api/apiError";
import { getTaskInstanceDetail } from "@/api/workflowInstance";
import { Button } from "@/components/ui/button";
import type {
  ItemTaskInstanceVO,
  ItemTaskNodeVO,
  TaskAttachment,
  TaskInstanceDetailVO,
  TaskInstanceStatus,
} from "@/types/workflowInstance";
import { createItemLifecycle } from "./itemLifecycle";
import { AttachmentOpenError, openTaskAttachment, type AttachmentPopup } from "./taskAttachments";

interface TaskDetailActions {
  currentUserId?: string | null;
  mutating: boolean;
  canSubmit: boolean;
  canReset: boolean;
  canReject: boolean;
  onClaim: () => void;
  onSubmit: () => void;
  onAbandon: () => void;
  onReject: () => void;
  onReset: () => void;
}

interface TaskDetailPanelProps {
  node: ItemTaskNodeVO;
  instance?: ItemTaskInstanceVO;
  revision: number;
  actions?: TaskDetailActions;
}

const STATUS_LABELS: Record<TaskInstanceStatus, string> = {
  PENDING: "待接取",
  CLAIMED: "进行中",
  COMPLETED: "已完成",
};

interface AttachmentCardProps {
  attachment: TaskAttachment;
  opening: boolean;
  disabled: boolean;
  onOpen: () => void;
}

function AttachmentCard({ attachment, opening, disabled, onOpen }: AttachmentCardProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const available = attachment.availability === "available";
  return (
    <button
      type="button"
      disabled={!available || disabled}
      onClick={onOpen}
      className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={`${available ? "打开" : "暂不可用"}：${attachment.name}`}
    >
      {available && attachment.mediaType === "image" && !previewFailed ? (
        <img
          src={attachment.readUrl}
          alt={attachment.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-16 shrink-0 rounded-lg border object-cover"
          onError={() => setPreviewFailed(true)}
        />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileText className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-medium">{attachment.name}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {available ? `${attachment.sizeText} · 打开附件` : "附件暂不可用，请联系任务提交人"}
        </span>
        {available && previewFailed && (
          <span className="mt-1 block text-xs text-muted-foreground">
            预览暂不可用，可打开原文件查看
          </span>
        )}
      </span>
      {available &&
        (opening ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : (
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
        ))}
    </button>
  );
}

function TaskActions({
  actions,
  instance,
}: {
  actions: TaskDetailActions;
  instance?: ItemTaskInstanceVO;
}) {
  if (!instance) return null;
  const isMine = Boolean(instance.assigneeId && instance.assigneeId === actions.currentUserId);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {instance.status === "PENDING" && (
        <Button size="sm" disabled={actions.mutating} onClick={actions.onClaim}>
          {actions.mutating && <Loader2 className="size-4 animate-spin" />}
          接取
        </Button>
      )}
      {instance.status === "CLAIMED" && isMine && actions.canSubmit && (
        <>
          <Button size="sm" disabled={actions.mutating} onClick={actions.onSubmit}>
            提交
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={actions.mutating}
            onClick={actions.onAbandon}
          >
            放弃
          </Button>
        </>
      )}
      {instance.status === "CLAIMED" && isMine && !actions.canSubmit && (
        <span className="text-xs text-muted-foreground">等待前置阶段完成</span>
      )}
      {instance.status === "COMPLETED" && actions.canReset && (
        <Button size="sm" variant="outline" disabled={actions.mutating} onClick={actions.onReset}>
          重置
        </Button>
      )}
      {instance.status === "COMPLETED" && actions.canReject && (
        <Button
          size="sm"
          variant="destructive"
          disabled={actions.mutating}
          onClick={actions.onReject}
        >
          打回
        </Button>
      )}
    </div>
  );
}

export default function TaskDetailPanel({
  node,
  instance,
  revision,
  actions,
}: TaskDetailPanelProps) {
  const instanceId = node.taskStatus === null ? undefined : (node.taskInstanceId ?? instance?.id);
  const [retry, setRetry] = useState(0);
  const contextKey = `${instanceId}:${revision}:${retry}:${instance?.status}:${instance?.completedAt}`;
  const lifecycle = useRef(createItemLifecycle(contextKey));
  lifecycle.current.switchTo(contextKey);
  const isCurrent = lifecycle.current.capture();
  const [loaded, setLoaded] = useState<{ key: string; detail: TaskInstanceDetailVO } | null>(null);
  const [error, setError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const opening = useRef(false);
  const popupRef = useRef<AttachmentPopup | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const detail = loaded?.key === contextKey ? loaded.detail : null;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoaded(null);
    setError("");
    setAttachmentError("");
    setOpeningId(null);
    opening.current = false;
    if (instanceId) {
      void getTaskInstanceDetail(instanceId, controller.signal)
        .then((result) => {
          if (active && isCurrent()) setLoaded({ key: contextKey, detail: result });
        })
        .catch((reason: unknown) => {
          if (reason instanceof ApiError) reason.silence();
          if (active && isCurrent()) setError("任务详情加载失败，请重新加载后再试。");
        });
    }
    return () => {
      active = false;
      controller.abort();
      popupRef.current?.close();
      popupRef.current = null;
      controllerRef.current = null;
    };
  }, [contextKey]);

  async function handleOpenAttachment(attachment: TaskAttachment): Promise<void> {
    if (!instanceId || !isCurrent() || opening.current) return;
    opening.current = true;
    setOpeningId(attachment.id);
    setAttachmentError("");
    const signal = controllerRef.current?.signal;
    const isActive = (): boolean => isCurrent() && Boolean(signal) && !signal?.aborted;
    try {
      await openTaskAttachment(attachment, {
        now: () => Date.now() / 1000,
        isCurrent: isActive,
        loadDetail: () => getTaskInstanceDetail(instanceId, signal),
        onDetail: (result) => setLoaded({ key: contextKey, detail: result }),
        openPopup: () => {
          const tab = window.open("", "_blank");
          if (!tab) return null;
          tab.opener = null;
          tab.document.title = "正在准备附件";
          const popup: AttachmentPopup = {
            navigate: (url) => tab.location.replace(url),
            close: () => tab.close(),
            isClosed: () => tab.closed,
          };
          popupRef.current = popup;
          return popup;
        },
      });
    } catch (reason: unknown) {
      if (reason instanceof ApiError) reason.silence();
      if (isActive()) {
        setAttachmentError(
          reason instanceof AttachmentOpenError ? reason.message : "附件打开失败，请稍后重试。",
        );
      }
    } finally {
      if (isActive()) {
        popupRef.current = null;
        opening.current = false;
        setOpeningId(null);
      }
    }
  }

  const status = detail?.task.status ?? instance?.status;
  const assigneeName = detail?.task.assignee?.nickname ?? instance?.assigneeNickname;
  const assigneeAvatar = detail?.task.assignee?.avatarUrl ?? instance?.assigneeAvatarUrl;
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-live="polite">
      {!instanceId ? (
        <>
          <h2 className="break-words text-base font-semibold">{node.name} · 任务详情</h2>
          <p className="mt-3 text-sm text-muted-foreground">任务尚未解锁，完成前置阶段后可接取。</p>
        </>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-base font-semibold">
                {detail?.task.name ?? node.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>第 {detail?.task.stage ?? node.sort} 阶段</span>
                <span aria-hidden="true">·</span>
                {assigneeAvatar && (
                  <img src={assigneeAvatar} alt="" className="size-5 rounded-full object-cover" />
                )}
                <span className="break-words">{assigneeName || "暂无执行人"}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {actions && <TaskActions actions={actions} instance={instance} />}
              {status && (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  {STATUS_LABELS[status]}
                </span>
              )}
            </div>
          </header>
          <div className="mt-4 border-t pt-4">
            {error ? (
              <div className="flex flex-wrap items-center gap-3">
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetry((current) => current + 1)}
                >
                  重新加载
                </Button>
              </div>
            ) : !detail ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                正在加载提交内容...
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">提交内容</h3>
                  {detail.submission.submittedAt && (
                    <span className="break-words text-xs text-muted-foreground">
                      提交时间：{detail.submission.submittedAt}
                    </span>
                  )}
                </div>
                {detail.submission.state === "not_submitted" ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    任务尚未提交，完成提交后可在这里查看内容和附件。
                  </p>
                ) : detail.submission.fields.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">任务已提交，无额外提交内容。</p>
                ) : (
                  <dl className="mt-3 space-y-4">
                    {detail.submission.fields.map((field) => (
                      <div key={field.key} className="min-w-0 rounded-xl bg-muted/30 p-3 sm:p-4">
                        <dt className="break-words text-xs font-medium text-muted-foreground">
                          {field.label}
                        </dt>
                        <dd className="mt-2">
                          {field.type === "file" ? (
                            field.file ? (
                              <AttachmentCard
                                key={`${field.file.id}:${field.file.availability === "available" ? field.file.readUrl : "unavailable"}`}
                                attachment={field.file}
                                opening={openingId === field.file.id}
                                disabled={openingId !== null}
                                onOpen={() => field.file && void handleOpenAttachment(field.file)}
                              />
                            ) : (
                              <p className="text-sm">未填写</p>
                            )
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {field.text}
                            </p>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {attachmentError && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {attachmentError}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
