import { useId, useState, type ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info, LoaderCircle, RotateCw } from "lucide-react";

import { getEmailNotifications, updateEmailNotifications } from "@/api/user";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { isScopeCurrent, scopedKey } from "@/lib/queryKeys";
import type { EmailNotificationsVO, UpdateEmailNotificationsDTO } from "@/types/user";

const EMAIL_NOTIFICATIONS_KEY = ["emailNotifications"];

export default function EmailNotificationToggle(): ReactElement {
  const id = useId();
  const session = useSessionSnapshot();
  const client = useQueryClient();
  const [helpOpen, setHelpOpen] = useState(false);
  const preference = useApiQuery({
    key: EMAIL_NOTIFICATIONS_KEY,
    queryFn: getEmailNotifications,
    scope: "account",
    staleTime: 0,
    refetchOnMount: true,
  });
  const save = useApiMutation({
    key: EMAIL_NOTIFICATIONS_KEY,
    scope: "account",
    mutationFn: async (dto: UpdateEmailNotificationsDTO): Promise<void> => {
      await updateEmailNotifications(dto);
      if (isScopeCurrent("account", session)) {
        client.setQueryData<EmailNotificationsVO>(
          scopedKey(EMAIL_NOTIFICATIONS_KEY, "account", session),
          { enabled: dto.enabled },
        );
      }
    },
  });

  return (
    <div className="ml-auto flex shrink-0 items-center gap-1.5">
      <span id={`${id}-label`} className="text-xs text-muted-foreground">
        邮件通知
      </span>
      <TooltipProvider>
        <Tooltip open={helpOpen} onOpenChange={setHelpOpen} triggerId={helpOpen ? id : null}>
          <TooltipTrigger
            id={id}
            closeOnClick={false}
            onClick={() => setHelpOpen(true)}
            render={<Button variant="ghost" size="icon-xs" aria-label="邮件通知说明" />}
          >
            <Info aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="bottom">开启后会发送邮件通知。</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {preference.isError ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="邮件通知配置加载失败，点击重试"
          disabled={preference.isFetching}
          onClick={() => void preference.refetch()}
        >
          <RotateCw aria-hidden="true" />
        </Button>
      ) : preference.data ? (
        <Switch
          aria-labelledby={`${id}-label`}
          aria-busy={save.isPending}
          checked={preference.data.enabled}
          disabled={preference.isFetching || save.isPending}
          onCheckedChange={(enabled) => save.mutate({ enabled })}
        />
      ) : (
        <span
          role="status"
          aria-label="正在读取邮件通知设置"
          className="flex h-5 w-8 items-center justify-center"
        >
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        </span>
      )}
    </div>
  );
}
