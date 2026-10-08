import type { TaskAttachment, TaskInstanceDetailVO } from "@/types/workflowInstance";

export class AttachmentOpenError extends Error {}

export interface AttachmentPopup {
  navigate: (url: string) => void;
  close: () => void;
  isClosed: () => boolean;
}

interface OpenTaskAttachmentOptions {
  now: () => number;
  openPopup: () => AttachmentPopup | null;
  loadDetail: () => Promise<TaskInstanceDetailVO>;
  isCurrent: () => boolean;
  onDetail: (detail: TaskInstanceDetailVO) => void;
}

/** Reserve the browser tab in the click handler, before any signed-link refresh. */
export async function openTaskAttachment(
  attachment: TaskAttachment,
  options: OpenTaskAttachmentOptions,
): Promise<void> {
  if (!options.isCurrent()) return;
  if (attachment.availability !== "available") throw new AttachmentOpenError("附件暂不可用");
  const popup = options.openPopup();
  if (!popup) throw new AttachmentOpenError("浏览器阻止了附件窗口，请允许弹出窗口后重试");
  try {
    let currentAttachment = attachment;
    if (attachment.expiresAt <= options.now() + 10) {
      const detail = await options.loadDetail();
      if (!options.isCurrent()) {
        popup.close();
        return;
      }
      options.onDetail(detail);
      const freshAttachment = detail.submission.fields
        .flatMap((field) => (field.type === "files" ? field.files : []))
        .find((file) => file.id === attachment.id);
      if (!freshAttachment || freshAttachment.availability !== "available") {
        throw new AttachmentOpenError("附件已不可用，请联系任务提交人");
      }
      if (freshAttachment.expiresAt <= options.now()) {
        throw new AttachmentOpenError("附件链接未能更新，请稍后重试");
      }
      currentAttachment = freshAttachment;
    }
    if (!options.isCurrent()) {
      popup.close();
      return;
    }
    if (popup.isClosed()) throw new AttachmentOpenError("附件窗口已关闭，请重新打开附件");
    popup.navigate(currentAttachment.readUrl);
  } catch (error) {
    popup.close();
    throw error;
  }
}
