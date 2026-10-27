export interface NotificationStatusVO {
  hasUnread: boolean;
}

export interface NotificationTaskSlotVO {
  name: string;
  slotIndex: number;
  slotTotal: number;
  serialStep: number | null;
}

interface NotificationSourceVO {
  projectId: string;
  projectTitle: string;
  itemId: string;
  itemTitle: string;
}

interface NotificationRecord {
  id: string;
  sourceId: string;
  createdAt: string;
  readAt: string | null;
  thumbnailUrl: string | null;
}

export type NotificationVO = NotificationRecord &
  (
    | {
        kind: "TASK_READY";
        source: (NotificationSourceVO & { taskSlot: NotificationTaskSlotVO }) | null;
      }
    | {
        kind: "TASK_ASSIGNED";
        source: (NotificationSourceVO & { taskSlot: NotificationTaskSlotVO }) | null;
      }
    | { kind: "ITEM_COMPLETED"; source: (NotificationSourceVO & { taskSlot: null }) | null }
    | { kind: "JOIN_APPLICATION"; source: { applicantName: string } | null }
    | {
        kind: "DELETION_REQUEST";
        source: {
          requesterName: string;
          targetType: "PROJECT" | "ITEM";
          targetTitle: string;
        } | null;
      }
  );

export interface NotificationCursor {
  createdAt: string;
  id: string;
  unread: boolean;
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
