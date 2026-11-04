import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, Eye, FileText, Loader2 } from "lucide-react";

import { ApiError } from "@/api/apiError";
import { getTaskInstanceDetail, getTaskSubmissionVersions } from "@/api/workflowInstance";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { isPlanningResourceNotFound, readPlanningResource } from "@/lib/planningResourceError";
import {
  archiveBytesFromSizeText,
  isArchiveFile,
} from "@/components/AttachmentPreview/previewable";
import {
  closeAttachmentPreview,
  openAttachmentPreview,
} from "@/components/AttachmentPreview/previewSession";
import RemoteImage from "@/components/RemoteImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ItemTaskInstanceVO,
  ItemTaskNodeVO,
  TaskAttachment,
  TaskDetailField,
  TaskInstanceDetailVO,
  TaskInstanceStatus,
  TaskSubmissionStatus,
  TaskSubmissionVersionVO,
} from "@/types/workflowInstance";
import { createItemLifecycle } from "./itemLifecycle";
import {
  AttachmentOpenError,
  openTaskAttachment,
  refreshTaskAttachment,
  type AttachmentPopup,
} from "./taskAttachments";
interface TaskDetailActions {
  currentUserId?: string | null;
  mutating: boolean;
  canSubmit: boolean;
  canReset: boolean;
  canReject: boolean;
  canOwnerCancel: boolean;
  canAssign: boolean;
  canProxySubmit: boolean;
  onOwnerCancel: () => void;
  onClaim: () => void;
  onAssign: () => void;
  onSubmit: () => void;
  onProxySubmit: () => void;
  onAbandon: () => void;
  onReject: () => void;
  onReset: () => void;
}

interface TaskDetailPanelProps {
  title: string;
  node: ItemTaskNodeVO;
  instance?: ItemTaskInstanceVO;
  actions?: TaskDetailActions;
}

const STATUS_LABELS: Record<TaskInstanceStatus, string> = {
  PENDING: "待接取",
  CLAIMED: "进行中",
  COMPLETED: "已完成",
};

const VERSION_STATUS_LABELS: Record<TaskSubmissionStatus, string> = {
  SUBMITTED: "已提交",
  REJECTED: "已打回",
  RESET: "已重置",
};

const VERSION_STATUS_VARIANTS: Record<TaskSubmissionStatus, "default" | "destructive" | "outline"> =
  {
    SUBMITTED: "default",
    REJECTED: "destructive",
    RESET: "outline",
  };

export function submissionVersionAuthorLine(
  version: Pick<TaskSubmissionVersionVO, "submitter" | "submittedAt">,
): string {
  return `${version.submitter?.nickname ?? "未知"} · ${version.submittedAt ?? "时间未知"}`;
}

export function currentVersionOf(
  state: TaskInstanceDetailVO["submission"]["state"],
  versions: TaskSubmissionVersionVO[],
): TaskSubmissionVersionVO | null {
  if (state !== "submitted") return null;
  return versions.find((version) => version.status === "SUBMITTED") ?? null;
}

export function versionFromDetail(detail: TaskInstanceDetailVO): TaskSubmissionVersionVO[] {
  if (detail.submission.state === "not_submitted") return [];
  return [
    {
      versionNo: 1,
      status: "SUBMITTED",
      submittedAt: detail.submission.submittedAt,
      submitter: detail.task.assignee,
      fields: detail.submission.fields,
      unreadable: false,
    },
  ];
}

interface AttachmentCardProps {
  attachment: TaskAttachment;
  opening: boolean;
  disabled: boolean;
  onPreview: () => void;
  onDownload: () => void;
}

function AttachmentCard({
  attachment,
  opening,
  disabled,
  onPreview,
  onDownload,
}: AttachmentCardProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const available = attachment.availability === "available";
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3">
      {available && attachment.mediaType === "image" && !previewFailed ? (
        <RemoteImage
          src={attachment.readUrl}
          alt={attachment.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-16 shrink-0 rounded-lg border"
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
          {available ? attachment.sizeText : "附件暂不可用，请联系任务提交人"}
        </span>
        {available && previewFailed && (
          <span className="mt-1 block text-xs text-muted-foreground">
            缩略图暂不可用，可预览或下载原文件
          </span>
        )}
      </span>
      {available && (
        <span className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`预览 ${attachment.name}`}
            onClick={onPreview}
          >
            <Eye />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`下载 ${attachment.name}`}
            disabled={disabled}
            onClick={onDownload}
          >
            {opening ? <Loader2 className="animate-spin" /> : <Download />}
          </Button>
        </span>
      )}
    </div>
  );
}

function VersionFields({
  fields,
  openingId,
  onPreviewAttachment,
  onDownloadAttachment,
}: {
  fields: TaskDetailField[];
  openingId: string | null;
  onPreviewAttachment: (attachment: TaskAttachment) => void;
  onDownloadAttachment: (attachment: TaskAttachment) => void;
}) {
  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">该版本未填写其他提交内容。</p>;
  }
  return (
    <dl className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="min-w-0 rounded-xl bg-muted/30 p-3 sm:p-4">
          <dt className="break-words text-xs font-medium text-muted-foreground">{field.label}</dt>
          <dd className="mt-2">
            {field.type === "file" ? (
              field.file ? (
                <AttachmentCard
                  key={`${field.file.id}:${field.file.availability === "available" ? field.file.readUrl : "unavailable"}`}
                  attachment={field.file}
                  opening={openingId === field.file.id}
                  disabled={openingId !== null}
                  onPreview={() => field.file && onPreviewAttachment(field.file)}
                  onDownload={() => field.file && onDownloadAttachment(field.file)}
                />
              ) : (
                <p className="text-sm">未填写</p>
              )
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{field.text}</p>
            )}
          </dd>
        </div>
      ))}
    </dl>
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
      {actions.canAssign && (
        <Button size="sm" variant="outline" disabled={actions.mutating} onClick={actions.onAssign}>
          分配
        </Button>
      )}
      {instance.status === "PENDING" && actions.canProxySubmit && (
        <Button
          size="sm"
          variant="outline"
          disabled={actions.mutating}
          onClick={actions.onProxySubmit}
        >
          代提交
        </Button>
      )}
      {instance.status === "CLAIMED" && isMine && (
        <>
          {actions.canSubmit && (
            <Button size="sm" disabled={actions.mutating} onClick={actions.onSubmit}>
              提交
            </Button>
          )}
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
      {actions.canOwnerCancel && (
        <Button
          size="sm"
          variant="destructive"
          disabled={actions.mutating}
          onClick={actions.onOwnerCancel}
        >
          取消接取
        </Button>
      )}
    </div>
  );
}

export default function TaskDetailPanel({ title, node, instance, actions }: TaskDetailPanelProps) {
  const instanceId = node.taskStatus === null ? undefined : (node.taskInstanceId ?? instance?.id);
  const contextKey = `${instanceId}:${instance?.status}:${instance?.revision}:${instance?.completedAt}`;
  const lifecycle = useRef(createItemLifecycle(contextKey));
  lifecycle.current.switchTo(contextKey);
  const isCurrent = lifecycle.current.capture();
  const detailQuery = useApiQuery({
    key: ["taskDetail", instanceId],
    queryFn: () => readPlanningResource("item", () => getTaskInstanceDetail(instanceId!)),
    throwOnError: isPlanningResourceNotFound,
    enabled: Boolean(instanceId),
    staleTime: 0,
  });
  const versionsQuery = useApiQuery({
    key: ["taskVersions", instanceId],
    queryFn: () => readPlanningResource("item", () => getTaskSubmissionVersions(instanceId!)),
    throwOnError: isPlanningResourceNotFound,
    enabled: Boolean(instanceId),
    staleTime: 0,
  });
  const detail = detailQuery.data;
  const versionList = versionsQuery.data ?? null;
  const error = detailQuery.isError && !detail ? "任务详情加载失败，请重新加载后再试。" : "";
  const versionError = versionsQuery.isError ? "版本记录加载失败，请重新加载后再试。" : "";
  const [attachmentError, setAttachmentError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const opening = useRef(false);
  const previewOwner = useRef(Symbol("task-attachment-preview"));
  const popupRef = useRef<AttachmentPopup | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const versionsView = versionList ?? (detail ? versionFromDetail(detail) : []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setAttachmentError("");
    setOpeningId(null);
    setExpandedVersion(null);
    opening.current = false;
    return () => {
      controller.abort();
      closeAttachmentPreview(previewOwner.current);
      popupRef.current?.close();
      popupRef.current = null;
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey]);

  function handlePreviewAttachment(attachment: TaskAttachment): void {
    if (!instanceId || !isCurrent() || attachment.availability !== "available") return;
    openAttachmentPreview({
      owner: previewOwner.current,
      fileName: attachment.name,
      fileSize: isArchiveFile(attachment.name)
        ? archiveBytesFromSizeText(attachment.sizeText)
        : undefined,
      resolveUrl: async (signal) => {
        const fresh = await refreshTaskAttachment(attachment, {
          now: () => Date.now() / 1000,
          isCurrent: () => isCurrent() && !signal.aborted,
          loadFields: async () => {
            const result = await versionsQuery.refetch();
            if (result.error || !result.data) throw result.error ?? new Error("版本记录加载失败");
            return result.data.flatMap((version) => version.fields);
          },
        });
        if (!fresh || signal.aborted) throw new DOMException("已取消", "AbortError");
        return fresh.readUrl;
      },
    });
  }

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
        loadFields: async () => {
          const result = await versionsQuery.refetch();
          if (result.error || !result.data) throw result.error ?? new Error("版本记录加载失败");
          return result.data.flatMap((version) => version.fields);
        },
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
  const submissionState = detail?.submission.state ?? "not_submitted";
  const current = currentVersionOf(submissionState, versionsView);
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-live="polite">
      {!instanceId ? (
        <>
          <h2 className="break-words text-base font-semibold">{title}</h2>
          <p className="mt-3 text-sm text-muted-foreground">任务尚未解锁，完成前置阶段后可接取。</p>
        </>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-base font-semibold">{title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>第 {detail?.task.stage ?? node.sort} 阶段</span>
                <span aria-hidden="true">·</span>
                {assigneeAvatar && (
                  <RemoteImage src={assigneeAvatar} alt="" className="size-5 rounded-full" />
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
                  onClick={() => {
                    void detailQuery.refetch();
                    void versionsQuery.refetch();
                  }}
                >
                  重新加载
                </Button>
              </div>
            ) : !detail ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                正在加载任务详情...
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">版本记录</h3>
                  <span className="break-words text-xs text-muted-foreground">
                    {versionsView.length > 0
                      ? `共 ${versionsView.length} 个版本${current ? ` · 当前 v${current.versionNo}` : ""}`
                      : "暂无版本"}
                  </span>
                </div>
                {versionsView.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {submissionState === "not_submitted"
                      ? "该任务还没有人提交，提交后在这里形成版本。"
                      : "该任务暂无版本记录。"}
                  </p>
                ) : versionList === null && !versionError ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    正在加载版本记录...
                  </p>
                ) : versionList === null && versionError ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p role="alert" className="text-sm text-destructive">
                      {versionError}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void detailQuery.refetch();
                        void versionsQuery.refetch();
                      }}
                    >
                      重新加载
                    </Button>
                  </div>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {versionsView.map((version) => {
                      const expanded =
                        expandedVersion === null
                          ? version.versionNo === current?.versionNo
                          : expandedVersion === version.versionNo;
                      return (
                        <li
                          key={version.versionNo}
                          className={
                            version.versionNo === current?.versionNo
                              ? "rounded-xl border bg-muted/40"
                              : "rounded-xl border"
                          }
                        >
                          <button
                            type="button"
                            className="flex w-full flex-wrap items-center gap-2 p-3 text-left"
                            aria-expanded={expanded}
                            onClick={() => setExpandedVersion(expanded ? null : version.versionNo)}
                          >
                            <span className="font-mono text-sm font-semibold">
                              v{version.versionNo}
                            </span>
                            <Badge
                              variant={
                                version.versionNo === current?.versionNo
                                  ? VERSION_STATUS_VARIANTS[version.status]
                                  : "outline"
                              }
                            >
                              {VERSION_STATUS_LABELS[version.status]}
                            </Badge>
                            {version.versionNo === current?.versionNo && (
                              <Badge variant="secondary">当前</Badge>
                            )}
                            <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                              {submissionVersionAuthorLine(version)}
                            </span>
                            {expanded ? (
                              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                            )}
                          </button>
                          {expanded && (
                            <div className="border-t p-3 sm:p-4">
                              {version.unreadable ? (
                                <p className="text-sm text-muted-foreground">
                                  该版本内容无法解析展示。
                                </p>
                              ) : (
                                <>
                                  <VersionFields
                                    fields={version.fields}
                                    openingId={openingId}
                                    onPreviewAttachment={handlePreviewAttachment}
                                    onDownloadAttachment={(attachment) =>
                                      void handleOpenAttachment(attachment)
                                    }
                                  />
                                  {version.status === "REJECTED" && (
                                    <div className="mt-4 rounded-xl bg-destructive/5 p-3">
                                      <p className="text-xs font-medium text-destructive">
                                        打回意见
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {version.reviewer?.nickname ?? "未知"} ·{" "}
                                        {version.reviewedAt ?? "时间未知"}
                                      </p>
                                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                                        {version.reviewComment ?? "（无）"}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
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
