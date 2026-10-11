import { useEffect } from "react";

import { showTip } from "@/components/tip/store";
import { notificationService } from "@/services/notification";

export function useNotifications(): void {
  useEffect(() => {
    return notificationService.subscribe((notification) => {
      showTip(notification.message, notification.type);
    });
  }, []);
}
