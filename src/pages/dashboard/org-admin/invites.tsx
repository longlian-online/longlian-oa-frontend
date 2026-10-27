import { useState } from "react";
import { Copy, Loader2, Ticket, TicketX } from "lucide-react";

import { createJoinInviteCode, revokeJoinInviteCode } from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import FilterSelectContent from "@/components/FilterSelectContent";
import InviteExpiryField from "@/components/InviteExpiryField";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import { usePageQuery } from "@/hooks/usePageQuery";
import { formatDate } from "@/lib/format";
import { toInviteExpiredAt } from "@/lib/inviteExpiry";
import {
  ORGANIZATION_ADMIN_PAGE_SIZE as PAGE_SIZE,
  organizationInviteCodesQuery,
} from "@/queries/organizationAdmin";
import type { JoinInviteCodeStatus, JoinInviteCodeVO } from "@/types/organizationAdmin";

type UsageMode = "unlimited" | "limited";
type StatusFilter = JoinInviteCodeStatus | "";

function usageLabel(invite: JoinInviteCodeVO): string {
  return invite.maxUses == null ? "不限次数" : `${invite.useCount} / ${invite.maxUses}`;
}

function OrganizationInvitesContent(): React.JSX.Element {
  const confirm = useConfirm();
  const [page, setPage] = usePageQuery();
  const [status, setStatus] = useState<StatusFilter>("");
  const [usageMode, setUsageMode] = useState<UsageMode>("unlimited");
  const [maxUses, setMaxUses] = useState("5");
  const [expiredAt, setExpiredAt] = useState("");
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const listQuery = useApiQuery(organizationInviteCodesQuery(status, page));
  const invites = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  const createMutation = useApiMutation<
    Awaited<ReturnType<typeof createJoinInviteCode>>,
    Parameters<typeof createJoinInviteCode>
  >({
    mutationFn: (args) => createJoinInviteCode(...args),
    invalidate: [["joinInviteCodes"]],
  });
  const revokeMutation = useApiMutation<
    Awaited<ReturnType<typeof revokeJoinInviteCode>>,
    Parameters<typeof revokeJoinInviteCode>
  >({
    mutationFn: (args) => revokeJoinInviteCode(...args),
    invalidate: [["joinInviteCodes"]],
  });

  async function handleCreate(): Promise<void> {
    const selectedExpiry = toInviteExpiredAt(expiredAt);
    if (!selectedExpiry) {
      $tip("请选择晚于当前时间的到期时间", "error");
      return;
    }
    const limited = usageMode === "limited";
    const parsed = Number(maxUses);
    if (limited && (!Number.isInteger(parsed) || parsed < 1)) {
      $tip("使用次数必须为正整数", "error");
      return;
    }
    try {
      const created = await createMutation.mutateAsync([
        limited ? { expiredAt: selectedExpiry, maxUses: parsed } : { expiredAt: selectedExpiry },
      ]);
      $tip(created.inviteCode ? `邀请码 ${created.inviteCode} 已生成` : "邀请码已生成", "success");
      setPage(1);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  async function handleCopy(invite: JoinInviteCodeVO): Promise<void> {
    setCopyingId(invite.id);
    try {
      await navigator.clipboard.writeText(invite.inviteCode);
      $tip("邀请码已复制", "success");
    } catch {
      $tip("复制失败，请手动复制邀请码", "error");
    } finally {
      setCopyingId(null);
    }
  }

  async function handleRevoke(invite: JoinInviteCodeVO): Promise<void> {
    const confirmed = await confirm({
      title: "失效邀请码？",
      description: `失效后「${invite.inviteCode}」会从列表移除，不能再用于加入组织，也不能恢复。`,
      confirmText: "失效",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await revokeMutation.mutateAsync([invite.id]);
      $tip("邀请码已失效", "success");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">邀请码</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理加入当前组织的邀请码。不限次数的邀请码在到期前可以重复使用。
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-end">
        <div className="grid gap-1.5">
          <Label>使用规则</Label>
          <Select
            value={usageMode}
            onValueChange={(value) => {
              if (value !== "unlimited" && value !== "limited") return;
              setUsageMode(value);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue>{usageMode === "limited" ? "指定次数" : "不限次数"}</SelectValue>
            </SelectTrigger>
            <FilterSelectContent>
              <SelectItem value="unlimited">不限次数</SelectItem>
              <SelectItem value="limited">指定次数</SelectItem>
            </FilterSelectContent>
          </Select>
        </div>
        <InviteExpiryField
          value={expiredAt}
          disabled={createMutation.isPending}
          onChange={setExpiredAt}
        />
        {usageMode === "limited" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="invite-max-uses">使用次数</Label>
            <Input
              id="invite-max-uses"
              inputMode="numeric"
              value={maxUses}
              className="w-32"
              onChange={(event) => setMaxUses(event.target.value.replace(/\D/g, ""))}
            />
          </div>
        ) : null}
        <Button disabled={createMutation.isPending} onClick={() => void handleCreate()}>
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Ticket className="size-4" />
          )}
          生成邀请码
        </Button>
        <div className="grid gap-1.5 lg:ml-auto">
          <Label>状态</Label>
          <Select
            value={status || "ALL"}
            onValueChange={(value) => {
              if (value !== "ALL" && value !== "PENDING" && value !== "USED") return;
              setStatus(value === "ALL" ? "" : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue>
                {status === "PENDING" ? "待使用" : status === "USED" ? "已用尽" : "全部"}
              </SelectValue>
            </SelectTrigger>
            <FilterSelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              <SelectItem value="PENDING">待使用</SelectItem>
              <SelectItem value="USED">已用尽</SelectItem>
            </FilterSelectContent>
          </Select>
        </div>
      </div>

      {listQuery.isError && !listQuery.data ? (
        <Button variant="outline" onClick={() => void listQuery.refetch()}>
          加载失败，重试
        </Button>
      ) : loading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          正在加载邀请码...
        </div>
      ) : invites.length === 0 ? (
        <EmptyState
          icon={<Ticket className="size-5 text-muted-foreground" />}
          title="暂无邀请码"
          description="生成后会显示在这里。手动失效的邀请码不再展示。"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邀请码</TableHead>
                  <TableHead>使用情况</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="w-40 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <code className="font-semibold tracking-widest">{invite.inviteCode}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{usageLabel(invite)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invite.expiredAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {invite.status === "USED" ? "已用尽" : "待使用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invite.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={copyingId === invite.id}
                          onClick={() => void handleCopy(invite)}
                        >
                          <Copy className="size-4" />
                          复制
                        </Button>
                        {invite.status === "PENDING" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={revokeMutation.isPending}
                            onClick={() => void handleRevoke(invite)}
                          >
                            <TicketX className="size-4" />
                            失效
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export default function OrganizationInvitesPage(): React.JSX.Element {
  return (
    <OrganizationAdminGuard>
      <OrganizationInvitesContent />
    </OrganizationAdminGuard>
  );
}
