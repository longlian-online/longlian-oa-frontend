import { useId, useState, type ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info, LoaderCircle, RotateCw } from "lucide-react";

import { getUserConfig, patchUserConfig } from "@/api/user";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { isScopeCurrent, scopedKey } from "@/lib/queryKeys";
import type { UpdateUserConfigDTO, UserConfig, UserConfigVO } from "@/types/user";

const USER_CONFIG_KEY = ["userConfig"];

const KINDS = [
  { kind: "TASK_READY", label: "可以开始", hint: "你接取的任务可以提交时发送邮件。" },
  { kind: "TASK_ASSIGNED", label: "任务分配", hint: "有任务分配给你时发送邮件。" },
  { kind: "TASK_REJECTED", label: "任务打回", hint: "你提交的任务被打回时发送邮件。" },
  { kind: "ITEM_COMPLETED", label: "项目完成", hint: "你创建的项目全部完成时发送邮件。" },
  { kind: "JOIN_APPLICATION", label: "入组申请", hint: "仅组织管理员会收到。" },
  { kind: "DELETION_REQUEST", label: "删除申请", hint: "仅组织管理员会收到。" },
] as const;

function Hint({ label, text }: { label: string; text: string }): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        id={id}
        closeOnClick={false}
        onClick={() => setOpen(true)}
        render={<Button variant="ghost" size="icon-xs" aria-label={`${label}说明`} />}
      >
        <Info aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{text}</TooltipContent>
    </Tooltip>
  );
}

type NotificationKind = (typeof KINDS)[number]["kind"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function kindEnabled(config: UserConfig, kind: NotificationKind): boolean {
  const kinds = config.notificationKinds;
  if (!isRecord(kinds)) return true;
  return kinds[kind] !== false;
}

function mergeConfig(current: UserConfig | undefined, patch: UserConfig): UserConfig {
  const next: UserConfig = { ...current, ...patch };
  if (isRecord(current?.notificationKinds) && isRecord(patch.notificationKinds)) {
    next.notificationKinds = { ...current.notificationKinds, ...patch.notificationKinds };
  }
  return next;
}

export default function NotificationPreferences(): ReactElement {
  const session = useSessionSnapshot();
  const client = useQueryClient();
  const preference = useApiQuery({
    key: USER_CONFIG_KEY,
    queryFn: getUserConfig,
    scope: "account",
    staleTime: 0,
    refetchOnMount: true,
  });
  const save = useApiMutation({
    key: USER_CONFIG_KEY,
    scope: "account",
    mutationFn: async (dto: UpdateUserConfigDTO): Promise<void> => {
      await patchUserConfig(dto);
      if (isScopeCurrent("account", session)) {
        client.setQueryData<UserConfigVO>(
          scopedKey(USER_CONFIG_KEY, "account", session),
          (current) => ({ config: mergeConfig(current?.config, dto.config) }),
        );
      }
    },
  });
  const config = preference.data?.config;

  if (preference.isError) {
    return (
      <Button
        variant="outline"
        disabled={preference.isFetching}
        onClick={() => void preference.refetch()}
      >
        <RotateCw aria-hidden="true" />
        通知设置加载失败，重试
      </Button>
    );
  }

  if (!config) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        正在读取通知设置
      </p>
    );
  }

  const busy = preference.isFetching || save.isPending;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1">
            <span id="email-notifications-label" className="text-sm font-medium">
              邮件通知
            </span>
            <Hint label="邮件通知" text="关闭后，所有类型都不再发送邮件。" />
          </span>
          <Switch
            aria-labelledby="email-notifications-label"
            aria-busy={save.isPending}
            checked={config.emailNotificationsEnabled !== false}
            disabled={busy}
            onCheckedChange={(enabled) =>
              save.mutate({ config: { emailNotificationsEnabled: enabled } })
            }
          />
        </div>
        <div className="ml-3 flex flex-col gap-3 border-l pl-3">
          {KINDS.map((item) => (
            <div key={item.kind} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1">
                <span id={`${item.kind}-label`} className="text-sm">
                  {item.label}
                </span>
                <Hint label={item.label} text={item.hint} />
              </span>
              <Switch
                aria-labelledby={`${item.kind}-label`}
                aria-busy={save.isPending}
                checked={kindEnabled(config, item.kind)}
                disabled={busy}
                onCheckedChange={(enabled) =>
                  save.mutate({ config: { notificationKinds: { [item.kind]: enabled } } })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
