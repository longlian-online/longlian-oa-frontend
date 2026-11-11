import { useState, type ReactElement } from "react";

import {
  generateMcpApiKey,
  getMcpApiKey,
  revokeMcpApiKey,
  type GeneratedMcpApiKey,
} from "@/api/mcpApiKey";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { isScopeCurrent } from "@/lib/queryKeys";

interface OrganizationMcpSettingsProps {
  orgId: string;
  orgName: string;
}

const STATE_LABELS = {
  NOT_CREATED: "未生成",
  ACTIVE: "有效",
  SUSPENDED: "已暂停",
  REVOKED: "已撤销",
} as const;

export default function OrganizationMcpSettings({
  orgId,
  orgName,
}: OrganizationMcpSettingsProps): ReactElement {
  const session = useSessionSnapshot();
  const confirm = useConfirm();
  const [secret, setSecret] = useState<GeneratedMcpApiKey | null>(null);
  const queryKey = ["mcpApiKey", orgId];
  const query = useApiQuery({
    key: queryKey,
    scope: "account",
    queryFn: () => getMcpApiKey(orgId),
    staleTime: 0,
  });
  const generate = useApiMutation<void, void>({
    key: ["generateMcpApiKey", orgId],
    scope: "account",
    invalidate: [queryKey],
    mutationFn: async (): Promise<void> => {
      const result = await generateMcpApiKey(orgId);
      // 仅放在当前组件中展示，Mutation 的返回值不携带原文，避免进入查询或 Mutation 缓存。
      if (isScopeCurrent("account", session)) setSecret(result);
    },
  });
  const revoke = useApiMutation({
    key: ["revokeMcpApiKey", orgId],
    scope: "account",
    invalidate: [queryKey],
    mutationFn: () => revokeMcpApiKey(orgId),
  });
  const info = query.data;
  const busy = generate.isPending || revoke.isPending;

  async function handleGenerate(): Promise<void> {
    if (
      info?.canRevoke &&
      !(await confirm({
        title: "重新生成 API Key？",
        description: `${orgName}的旧 Key 将立即作废，已连接的 AI 客户端需要更新 Key。`,
        confirmText: "重新生成",
      }))
    )
      return;
    try {
      await generate.mutateAsync();
    } catch {
      // 共享 Mutation 负责错误提示。
    }
  }

  async function handleRevoke(): Promise<void> {
    if (
      !(await confirm({
        title: "撤销 API Key？",
        description: `使用${orgName} Key 的 AI 客户端将无法继续访问。`,
        confirmText: "撤销",
        variant: "destructive",
      }))
    )
      return;
    try {
      await revoke.mutateAsync();
      setSecret(null);
      $tip("API Key 已撤销", "success");
    } catch {
      // 共享 Mutation 负责错误提示。
    }
  }

  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      $tip("已复制", "success");
    } catch {
      $tip("无法复制，请手动选择并复制", "error");
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-medium">MCP 访问</h2>
        {info ? (
          <span className="text-sm text-muted-foreground">{STATE_LABELS[info.state]}</span>
        ) : null}
      </div>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">正在读取 API Key</p>
      ) : query.isError ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">API Key 加载失败</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            重试
          </Button>
        </div>
      ) : info ? (
        <>
          {info.prefix ? (
            <div className="space-y-1">
              <p className="font-mono text-sm">{info.prefix}…</p>
              <p className="text-xs text-muted-foreground">生成于 {info.generatedAt}</p>
            </div>
          ) : null}
          {info.revokedAt ? (
            <p className="text-xs text-muted-foreground">撤销于 {info.revokedAt}</p>
          ) : null}
          {info.suspendedReason ? (
            <p className="text-sm text-muted-foreground">{info.suspendedReason}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={busy || !info.canGenerate}
              onClick={() => void handleGenerate()}
            >
              {generate.isPending
                ? "生成中..."
                : info.canRevoke
                  ? "重新生成 API Key"
                  : "生成 API Key"}
            </Button>
            {info.canRevoke ? (
              <Button variant="ghost" disabled={busy} onClick={() => void handleRevoke()}>
                {revoke.isPending ? "撤销中..." : "撤销"}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
      <Dialog
        open={secret !== null}
        onOpenChange={(open) => {
          if (!open) setSecret(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{orgName} · API Key</DialogTitle>
            <DialogDescription>
              完整 Key 仅本次显示，请复制保存。它只允许 AI 以你的身份访问此组织的 MCP 工具。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mcp-secret">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="mcp-secret"
                readOnly
                value={secret?.apiKey ?? ""}
                autoComplete="off"
                className="font-mono"
              />
              <Button variant="outline" onClick={() => void copy(secret?.apiKey ?? "")}>
                复制 Key
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-endpoint">MCP 地址</Label>
            <Input id="mcp-endpoint" readOnly value={secret?.mcpUrl ?? ""} />
          </div>
          <p className="text-sm text-muted-foreground">
            使用 Streamable HTTP，在 Authorization 请求头填写 Bearer 加空格和上方 Key，无需填写组织
            ID。
          </p>
          <DialogFooter>
            <Button onClick={() => setSecret(null)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
