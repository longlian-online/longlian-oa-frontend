import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { Download, Eye, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";

import { ApiError } from "@/api/apiError";
import {
  closeAttachmentPreview,
  openAttachmentPreview,
} from "@/components/AttachmentPreview/previewSession";
import {
  createProjectAttachment,
  deleteProjectAttachment,
  getProjectAttachmentDownload,
} from "@/api/planning";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { projectAttachmentsQuery } from "@/queries/planning";
import { useConfirm } from "@/hooks/useConfirm";
import { useUploadFile } from "@/hooks/useUploadFile";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/format";
import type { ProjectAttachmentVO } from "@/types/projectAttachment";

interface ProjectAttachmentsProps {
  projectId: string;
  isCreator: boolean;
}

export default function ProjectAttachments({
  projectId,
  isCreator,
}: ProjectAttachmentsProps): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewOwner = useRef(Symbol("project-attachment-preview"));
  const attachmentsQuery = useApiQuery(projectAttachmentsQuery(projectId));
  const attachments = attachmentsQuery.data ?? [];
  const { uploading, uploadFile } = useUploadFile();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const confirm = useConfirm();
  const createMutation = useApiMutation({
    mutationFn: (fileId: string) => createProjectAttachment(projectId, fileId),
    invalidate: [["projects", "attachments"]],
  });
  const deleteMutation = useApiMutation({
    mutationFn: (attachmentId: string) => deleteProjectAttachment(projectId, attachmentId),
    invalidate: [["projects", "attachments"]],
  });

  async function handleUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const uploaded = await uploadFile(file, {
        bizType: "project_attachment",
        bizId: projectId,
        skipCrop: true,
      });
      await createMutation.mutateAsync(uploaded.fileId);
      $tip("附件已添加", "success");
    } catch {
      /* 上传与绑定失败提示由接口层负责。 */
    }
  }

  useEffect(() => () => closeAttachmentPreview(previewOwner.current), []);

  function handlePreview(attachment: ProjectAttachmentVO): void {
    openAttachmentPreview({
      owner: previewOwner.current,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      resolveUrl: async () => {
        const { readUrl } = await getProjectAttachmentDownload(projectId, attachment.id);
        return readUrl;
      },
    });
  }

  async function handleDownload(attachment: ProjectAttachmentVO): Promise<void> {
    if (openingId) return;
    // 先占用标签页，避免签名链接返回后被浏览器拦截。
    const tab = window.open("", "_blank");
    if (!tab) {
      $tip("浏览器阻止了附件窗口，请允许弹出窗口后重试", "error");
      return;
    }
    tab.opener = null;
    tab.document.title = "正在准备附件";
    setOpeningId(attachment.id);
    try {
      const { readUrl } = await getProjectAttachmentDownload(projectId, attachment.id);
      tab.location.replace(readUrl);
    } catch (error) {
      tab.close();
      if (error instanceof ApiError) {
        error.silence();
        $tip(error.message, "error");
      } else {
        $tip("附件打开失败，请稍后重试", "error");
      }
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete(attachment: ProjectAttachmentVO): Promise<void> {
    const confirmed = await confirm({
      title: "删除附件？",
      description: `删除后「${attachment.fileName}」将不可恢复。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(attachment.id);
      $tip("附件已删除", "success");
    } catch {
      /* 全局 Mutation 错误提示保留当前数据。 */
    }
  }

  return (
    <section
      id="project-attachments"
      aria-labelledby="project-attachments-title"
      className="scroll-mt-6 border-t pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          tabIndex={-1}
          id="project-attachments-title"
          className="scroll-mt-6 rounded-sm text-base font-semibold outline-none data-[locate-highlight]:ring-2 data-[locate-highlight]:ring-ring data-[locate-highlight]:ring-offset-4"
        >
          附件
        </h2>
        {isCreator && (
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
            <Button
              variant="outline"
              disabled={uploading || createMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploading || createMutation.isPending ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Paperclip data-icon="inline-start" />
              )}
              {uploading ? "上传中..." : "添加附件"}
            </Button>
          </>
        )}
      </div>

      {attachmentsQuery.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
      ) : attachments.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">暂无附件</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium" title={attachment.fileName}>
                  {attachment.fileName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(attachment.fileSize)} · {attachment.uploaderName} ·{" "}
                  {formatDate(attachment.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`预览 ${attachment.fileName}`}
                  onClick={() => handlePreview(attachment)}
                >
                  <Eye />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`下载 ${attachment.fileName}`}
                  disabled={openingId === attachment.id}
                  onClick={() => void handleDownload(attachment)}
                >
                  {openingId === attachment.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                </Button>
                {isCreator && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`删除 ${attachment.fileName}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => void handleDelete(attachment)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
