import { useState, type ReactElement } from "react";
import { LoaderCircle, Plus, RotateCw } from "lucide-react";

import { ApiError } from "@/api/apiError";
import { createOpenApiKey, listOpenApiKeys, revokeOpenApiKey } from "@/api/openApiKey";
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
import { useConfirm } from "@/hooks/useConfirm";
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { formatDate } from "@/lib/format";

import type { OpenApiKeyVO } from "@/types/openApiKey";

const OPEN_API_KEYS_KEY = ["openApiKeys"] as const;

interface CreatedKey {
  name: string;
  key: string;
}

function handleFailure(error: unknown, fallback: string): void {
  if (error instanceof ApiError) {
    error.silence();
    $tip(error.message, "error");
  } else {
    $tip(fallback, "error");
  }
}

/** 单条密钥：名称 + 吊销一行，创建时间/最近使用分行展示。 */
function KeyRow({
  apiKey,
  revocable,
  onRevoke,
}: {
  apiKey: OpenApiKeyVO;
  revocable: boolean;
  onRevoke: () => void;
}): ReactElement {
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{apiKey.name}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!revocable}
          title={revocable ? undefined : "先在页头切换到该组织再吊销"}
          onClick={onRevoke}
        >
          吊销
        </Button>
      </div>
      <dl className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-xs">
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 text-muted-foreground">创建时间</dt>
          <dd className="text-foreground/80">{formatDate(apiKey.createdAt)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 text-muted-foreground">最近使用</dt>
          <dd className="text-foreground/80">
            {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : "从未使用"}
          </dd>
        </div>
      </dl>
    </li>
  );
}

/** 组织配置块内「OpenAPI 密钥」一节的内容：跟随页签组织，创建走弹窗。 */
export default function OpenApiKeySettings({ orgId }: { orgId: string }): ReactElement | null {
  const confirm = useConfirm();
  const sessionOrgId = useSessionSnapshot().orgId;
  const groupsQuery = useApiQuery({
    key: OPEN_API_KEYS_KEY,
    queryFn: listOpenApiKeys,
    scope: "account",
    staleTime: 0,
    refetchOnMount: true,
  });
  const createMutation = useApiMutation({
    key: OPEN_API_KEYS_KEY,
    mutationFn: createOpenApiKey,
    invalidate: [OPEN_API_KEYS_KEY],
    scope: "account",
  });
  const revokeMutation = useApiMutation({
    key: OPEN_API_KEYS_KEY,
    mutationFn: revokeOpenApiKey,
    invalidate: [OPEN_API_KEYS_KEY],
    scope: "account",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStage, setDialogStage] = useState<"form" | "created">("form");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const busy = createMutation.isPending || revokeMutation.isPending;

  // 创建与吊销都按会话当前组织落库，非当前组织的页签只读展示
  const canManage = sessionOrgId !== null && String(sessionOrgId) === orgId;
  const group = groupsQuery.data?.find((entry) => String(entry.orgId) === orgId);
  const atLimit = group !== undefined && group.keys.length >= group.maxKeys;

  function closeDialog(): void {
    setDialogOpen(false);
    setDialogStage("form");
    setCreated(null);
    setName("");
    setNameError(null);
  }

  async function handleCreate(): Promise<void> {
    const trimmed = name.trim();
    if (trimmed === "") {
      setNameError("名称不能为空");
      return;
    }
    if (trimmed.length > 50) {
      setNameError("名称最多 50 个字符");
      return;
    }
    setNameError(null);
    try {
      const result = await createMutation.mutateAsync({ name: trimmed });
      setCreated({ name: trimmed, key: result.key });
      setDialogStage("created");
    } catch (error) {
      handleFailure(error, "创建失败，请稍后重试");
    }
  }

  async function handleRevoke(apiKey: OpenApiKeyVO): Promise<void> {
    const confirmed = await confirm({
      title: "吊销密钥？",
      description: `吊销后「${apiKey.name}」立即失效，不可恢复。`,
      confirmText: "吊销",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await revokeMutation.mutateAsync(apiKey.id);
    } catch (error) {
      handleFailure(error, "吊销失败，请稍后重试");
    }
  }

  async function handleCopy(): Promise<void> {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      $tip("已复制到剪贴板", "success");
    } catch {
      $tip("复制失败，请手动复制", "error");
    }
  }

  const dialog = (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-md">
        {dialogStage === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>新建 OpenAPI 密钥</DialogTitle>
              <DialogDescription>
                {group ? `每个组织最多 ${group.maxKeys} 个。` : null}
                创建后完整密钥只展示一次，关闭后无法再查看。
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreate();
              }}
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="openapi-key-name">名称</Label>
                <Input
                  id="openapi-key-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (nameError !== null) setNameError(null);
                  }}
                />
              </div>
              {nameError !== null ? (
                <p id="openapi-key-name-error" className="text-sm text-destructive">
                  {nameError}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>密钥已创建</DialogTitle>
              <DialogDescription>
                {created === null
                  ? null
                  : `「${created.name}」的完整密钥仅展示这一次，请立即复制保存：`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-muted p-3 text-sm">
                {created?.key}
              </code>
              <Button variant="outline" onClick={() => void handleCopy()}>
                复制
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={closeDialog}>完成</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  if (groupsQuery.isError) {
    return (
      <Button
        variant="outline"
        className="w-fit"
        disabled={groupsQuery.isFetching}
        onClick={() => void groupsQuery.refetch()}
      >
        <RotateCw aria-hidden="true" />
        密钥列表加载失败，重试
      </Button>
    );
  }
  if (groupsQuery.data === undefined) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        正在读取密钥列表
      </p>
    );
  }
  if (!group) {
    // 后端按成员资格返回分组；缺组（如列表缓存滞后）按空态展示，不影响创建入口
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-fit"
          disabled={busy || !canManage}
          title={!canManage ? "先在页头切换到该组织再新建" : undefined}
          onClick={() => {
            setDialogStage("form");
            setDialogOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          新建密钥
        </Button>
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          还没有密钥，点击上方按钮新建
        </p>
        {dialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          已用 {group.keys.length}/{group.maxKeys}
        </span>
        {canManage ? null : (
          <span className="text-xs text-muted-foreground">创建或吊销需先在页头切换到该组织</span>
        )}
      </div>
      <Button
        variant="outline"
        className="w-fit"
        disabled={busy || atLimit || !canManage}
        title={
          !canManage
            ? "先在页头切换到该组织再新建"
            : atLimit
              ? "已达上限，请先吊销不用的密钥"
              : undefined
        }
        onClick={() => {
          setDialogStage("form");
          setDialogOpen(true);
        }}
      >
        <Plus aria-hidden="true" />
        新建密钥
      </Button>
      {group.keys.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          还没有密钥，点击上方按钮新建
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {group.keys.map((apiKey) => (
            <KeyRow
              key={apiKey.id}
              apiKey={apiKey}
              revocable={canManage && !busy}
              onRevoke={() => void handleRevoke(apiKey)}
            />
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
