import type { TaskAttachment, TaskDetailField } from "@/types/workflowInstance";

export class AttachmentOpenError extends Error {}

export interface AttachmentPopup {
  navigate: (url: string) => void;
  close: () => void;
  isClosed: () => boolean;
}

interface RefreshTaskAttachmentOptions {
  now: () => number;
  loadFields: () => Promise<TaskDetailField[]>;
  isCurrent: () => boolean;
}

interface OpenTaskAttachmentOptions extends RefreshTaskAttachmentOptions {
  openPopup: () => AttachmentPopup | null;
}

type AvailableTaskAttachment = Extract<TaskAttachment, { availability: "available" }>;

function isAvailableAttachment(
  attachment: TaskAttachment | null | undefined,
): attachment is AvailableTaskAttachment {
  return attachment?.availability === "available";
}

/** 链接剩余有效期不超过 10 秒时重新取详情。离开当前任务时返回 null。 */
export async function refreshTaskAttachment(
  attachment: TaskAttachment,
  options: RefreshTaskAttachmentOptions,
): Promise<AvailableTaskAttachment | null> {
  if (!options.isCurrent()) return null;
  if (!isAvailableAttachment(attachment)) throw new AttachmentOpenError("附件暂不可用");
  if (attachment.expiresAt > options.now() + 10) return attachment;
  const freshFields = await options.loadFields();
  if (!options.isCurrent()) return null;
  const freshAttachment = freshFields
    .map((field) => (field.type === "file" ? field.file : null))
    .find((file) => file?.id === attachment.id);
  if (!isAvailableAttachment(freshAttachment)) {
    throw new AttachmentOpenError("附件已不可用，请联系任务提交人");
  }
  if (freshAttachment.expiresAt <= options.now()) {
    throw new AttachmentOpenError("附件链接未能更新，请稍后重试");
  }
  return freshAttachment;
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
    const currentAttachment = await refreshTaskAttachment(attachment, options);
    if (!currentAttachment || !options.isCurrent()) {
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
