import { getNotificationStatus, markNotificationRead } from "@/api/notifications";
import { ApiError } from "@/api/apiError";
import { AuthExpiredError } from "@/lib/authError";
import { queryClient } from "@/lib/queryClient";
import { scopedKey } from "@/lib/queryKeys";
import { getSessionSnapshot } from "@/lib/session";

/** 邮件入口打开后标已读。失败不拦截跳转；登录失效仍交给会话处理。 */
export async function acknowledgeEmailNotification(notificationId: string): Promise<void> {
  try {
    await markNotificationRead(notificationId);
  } catch (error) {
    if (error instanceof AuthExpiredError) throw error;
    if (error instanceof ApiError) error.silence();
    return;
  }
  const session = getSessionSnapshot();
  queryClient.removeQueries({ queryKey: scopedKey(["notifications"], "org", session) });
  try {
    const status = await getNotificationStatus();
    queryClient.setQueryData(scopedKey(["notificationStatus"], "org", session), status);
  } catch (error) {
    if (error instanceof AuthExpiredError) throw error;
    if (error instanceof ApiError) error.silence();
    queryClient.removeQueries({ queryKey: scopedKey(["notificationStatus"], "org", session) });
  }
}
