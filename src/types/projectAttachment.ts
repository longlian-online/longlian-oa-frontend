export interface ProjectAttachmentVO {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileMime: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
}

export interface ProjectAttachmentDownloadVO {
  readUrl: string;
  /** 签名链接过期时间，Unix 秒。 */
  expireAt: number;
}
