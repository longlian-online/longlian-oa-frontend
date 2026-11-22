import { useState, type ReactElement } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";

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
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatDate } from "@/lib/format";

import type { OpenApiKeyGroupVO, OpenApiKeyVO } from "@/types/openApiKey";

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

function KeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey: OpenApiKeyVO;
  onRevoke: () => void;
}): ReactElement {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{apiKey.name}</span>
        <span className="text-xs text-muted-foreground">
          创建于 {formatDate(apiKey.createdAt)}
          {apiKey.lastUsedAt ? ` · 最近使用 ${formatDate(apiKey.lastUsedAt)}` : " · 未使用过"}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onRevoke}>
        吊销
      </Button>
    </li>
  );
}

function KeyGroup({
  group,
  onRevoke,
}: {
  group: OpenApiKeyGroupVO;
  onRevoke: (key: OpenApiKeyVO) => void;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{group.orgName}</span>
        <span className="text-xs text-muted-foreground">
          已用 {group.keys.length}/{group.maxKeys}
        </span>
      </div>
      {group.keys.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          暂无密钥
        </p>
      ) : (
        <ul className="flex flex-col">
          {group.keys.map((apiKey) => (
            <KeyRow key={apiKey.id} apiKey={apiKey} onRevoke={() => onRevoke(apiKey)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OpenApiKeySettings(): ReactElement {
  const confirm = useConfirm();
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
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const busy = createMutation.isPending || revokeMutation.isPending;

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
      setName("");
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

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-medium">OpenAPI 密钥</h2>
      {groupsQuery.isError ? (
        <Button
          variant="outline"
          className="w-fit"
          disabled={groupsQuery.isFetching}
          onClick={() => void groupsQuery.refetch()}
        >
          <RotateCw aria-hidden="true" />
          密钥列表加载失败，重试
        </Button>
      ) : groupsQuery.data === undefined ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          正在读取密钥列表
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">为其他组织创建请先切换组织</p>
          <div className="flex flex-col gap-4">
            {groupsQuery.data.map((group) => (
              <KeyGroup key={group.orgId} group={group} onRevoke={handleRevoke} />
            ))}
          </div>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="openapi-key-name">名称</Label>
                <Input
                  id="openapi-key-name"
                  className="w-56"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (nameError !== null) setNameError(null);
                  }}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </div>
            {nameError !== null ? (
              <p id="openapi-key-name-error" className="text-sm text-destructive">
                {nameError}
              </p>
            ) : null}
          </form>
        </>
      )}
      <Dialog
        open={created !== null}
        onOpenChange={(open) => {
          if (!open) setCreated(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>密钥已创建</DialogTitle>
            <DialogDescription>
              {created === null ? null : `「${created.name}」`}
              完整密钥仅展示这一次，关闭后无法再查看。
            </DialogDescription>
          </DialogHeader>
          <code className="block break-all rounded-lg bg-muted p-3 text-sm">{created?.key}</code>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreated(null)}>
              关闭
            </Button>
            <Button onClick={() => void handleCopy()}>复制</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
