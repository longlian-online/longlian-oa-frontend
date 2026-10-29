import { type ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, RotateCw } from "lucide-react";

import { getUserConfig, patchUserConfig } from "@/api/user";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { isScopeCurrent, scopedKey } from "@/lib/queryKeys";
import type { UpdateUserConfigDTO, UserConfig, UserConfigVO } from "@/types/user";

const USER_CONFIG_KEY = ["userConfig"];

const KINDS = [
  { kind: "TASK_READY", label: "可以开始" },
  { kind: "TASK_ASSIGNED", label: "任务分配" },
  { kind: "ITEM_COMPLETED", label: "项目完成" },
  { kind: "JOIN_APPLICATION", label: "入组申请", note: "仅组织管理员会收到" },
  { kind: "DELETION_REQUEST", label: "删除申请", note: "仅组织管理员会收到" },
] as const;

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span id="email-notifications-label" className="text-sm">
          邮件通知
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
      {KINDS.map((item) => (
        <div key={item.kind} className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span id={`${item.kind}-label`} className="text-sm">
              {item.label}
            </span>
            {"note" in item ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">{item.note}</span>
            ) : null}
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
  );
}
