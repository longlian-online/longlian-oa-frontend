export interface NotificationStatusVO {
  hasUnread: boolean;
}

export interface NotificationContentVO {
  label: string;
  message: string;
  targetPath: string | null;
  thumbnailUrl: string | null;
}

export interface NotificationVO {
  id: string;
  kind: string;
  sourceId: string;
  createdAt: string;
  readAt: string | null;
  content: NotificationContentVO;
}

export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export interface NotificationPageVO {
  list: NotificationVO[];
  hasNext: boolean;
  unreadCount: number;
}

export interface NotificationReadVO {
  id: string;
  readAt: string;
}

export interface NotificationReadAllVO {
  readAt: string;
}
