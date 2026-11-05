import type { TaskAttachment } from "@/types/workflowInstance";

export class AttachmentOpenError extends Error {}

export interface AttachmentPopup {
  navigate: (url: string) => void;
  close: () => void;
  isClosed: () => boolean;
}

interface OpenTaskAttachmentOptions {
  openPopup: () => AttachmentPopup | null;
  loadUrl: () => Promise<string>;
  isCurrent: () => boolean;
}

/** 先占住标签页，再向服务端取当次签名链接。详情里没有读取地址。 */
export async function openTaskAttachment(
  attachment: TaskAttachment,
  options: OpenTaskAttachmentOptions,
): Promise<void> {
  if (!options.isCurrent()) return;
  if (attachment.availability !== "available") throw new AttachmentOpenError("附件暂不可用");
  const popup = options.openPopup();
  if (!popup) throw new AttachmentOpenError("浏览器阻止了附件窗口，请允许弹出窗口后重试");
  try {
    const readUrl = await options.loadUrl();
    if (!options.isCurrent()) {
      popup.close();
      return;
    }
    if (popup.isClosed()) throw new AttachmentOpenError("附件窗口已关闭，请重新打开附件");
    popup.navigate(readUrl);
  } catch (error) {
    popup.close();
    throw error;
  }
}
