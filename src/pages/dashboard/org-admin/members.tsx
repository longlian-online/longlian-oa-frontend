import { useEffect, useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import { getSessionSnapshot, saveCurrentOrganization } from "@/lib/session";
import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import {
  changeMemberRole,
  changeMemberStatus,
  getMemberSubmitCounts,
  getOrganizationMembers,
  type OrgMemberRole,
} from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationInviteDialog from "@/components/OrganizationInviteDialog";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/hooks/useConfirm";
import { formatDate } from "@/lib/format";
import type { OrganizationMemberVO } from "@/types/organizationAdmin";

import {
  commitMemberListFilters,
  MEMBER_SEARCH_DEBOUNCE_MS,
  type MemberListFilters,
} from "./memberListFilters";

const PAGE_SIZE = 10;

function memberName(member: OrganizationMemberVO): string {
  return member.nickname || member.username || member.userId;
}

function OrganizationMembersContent() {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<MemberListFilters>({
    keyword: "",
    startJoinedTime: "",
    endJoinedTime: "",
    orderDir: "DESC",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const appliedFiltersRef = useRef(appliedFilters);
  const changeMemberRoleMutation = useApiMutation<
    Awaited<ReturnType<typeof changeMemberRole>>,
    Parameters<typeof changeMemberRole>
  >({
    mutationFn: (args) => changeMemberRole(...args),
    invalidate: [["members"], ["applications"], ["memberSubmitCounts"], ["currentUser"]],
  });
  const changeMemberStatusMutation = useApiMutation<
    Awaited<ReturnType<typeof changeMemberStatus>>,
    Parameters<typeof changeMemberStatus>
  >({
    mutationFn: (args) => changeMemberStatus(...args),
    invalidate: [["members"], ["applications"], ["memberSubmitCounts"], ["currentUser"]],
  });
  const [page, setPage] = useState(1);
  const mutatingId = changeMemberStatusMutation.isPending
    ? String(changeMemberStatusMutation.variables?.[0] ?? "new")
    : null;
  const [detailMember, setDetailMember] = useState<OrganizationMemberVO | null>(null);
  const detailQuery = useApiQuery({
    key: ["memberSubmitCounts", detailMember?.id],
    queryFn: () => getMemberSubmitCounts(detailMember!.id),
    enabled: Boolean(detailMember),
  });
  const submitCounts = detailQuery.data?.list ?? [];
  const detailLoading = detailQuery.isLoading;
  const [roleMember, setRoleMember] = useState<OrganizationMemberVO | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>("ORG_USER");
  const savingRole = changeMemberRoleMutation.isPending;

  useEffect(() => {
    const next = commitMemberListFilters(appliedFiltersRef.current, filters);
    if (!next) return;
    const timer = window.setTimeout(() => {
      appliedFiltersRef.current = next;
      setAppliedFilters(next);
      setPage(1);
    }, MEMBER_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const listQuery = useApiQuery({
    key: ["members", "management", appliedFilters, page],
    queryFn: () =>
      getOrganizationMembers({
        pageNum: page,
        pageSize: PAGE_SIZE,
        keyword: appliedFilters.keyword || undefined,
        startJoinedTime: appliedFilters.startJoinedTime || undefined,
        endJoinedTime: appliedFilters.endJoinedTime || undefined,
        orderDir: appliedFilters.orderDir,
      }),
  });
  const members = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;

  async function handleStatusChange(member: OrganizationMemberVO): Promise<void> {
    try {
      const disabled = member.status === "DISABLED";
      const confirmed = await confirm({
        title: disabled ? "启用成员？" : "禁用成员？",
        description: disabled
          ? `启用后「${memberName(member)}」可以继续参与组织工作。`
          : `禁用后「${memberName(member)}」将无法继续参与组织工作。`,
        confirmText: disabled ? "启用" : "禁用",
        variant: disabled ? "default" : "destructive",
      });
      if (!confirmed) return;

      await changeMemberStatusMutation.mutateAsync([member.id, disabled ? "ENABLED" : "DISABLED"]);
      if (!disabled && member.userId === getSessionSnapshot().userId)
        saveCurrentOrganization("", null);
      $tip(disabled ? "成员已启用" : "成员已禁用", "success");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  function handleOpenSubmitCounts(member: OrganizationMemberVO): void {
    setDetailMember(member);
  }

  function openRoleDialog(member: OrganizationMemberVO): void {
    setRoleMember(member);
    setSelectedRole(member.orgRole ?? "ORG_USER");
  }

  async function handleRoleChange(): Promise<void> {
    try {
      if (!roleMember) return;
      await changeMemberRoleMutation.mutateAsync([roleMember.id, selectedRole]);
      if (roleMember.userId === getSessionSnapshot().userId)
        saveCurrentOrganization(getSessionSnapshot().orgId ?? "", selectedRole);
      $tip("角色已修改", "success");
      setRoleMember(null);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">成员管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看组织成员，管理成员状态与组织角色。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrganizationInviteDialog />
          <div className="relative w-56 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.keyword}
              placeholder="搜索成员"
              className="pl-9"
              onChange={(event) =>
                setFilters((current) => ({ ...current, keyword: event.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="member-start-joined" className="shrink-0 text-xs text-muted-foreground">
              开始
            </Label>
            <Input
              id="member-start-joined"
              type="date"
              lang="zh-CN"
              aria-label="入组开始日期"
              value={filters.startJoinedTime}
              className="w-36"
              onChange={(event) =>
                setFilters((current) => ({ ...current, startJoinedTime: event.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="member-end-joined" className="shrink-0 text-xs text-muted-foreground">
              结束
            </Label>
            <Input
              id="member-end-joined"
              type="date"
              lang="zh-CN"
              aria-label="入组结束日期"
              value={filters.endJoinedTime}
              className="w-36"
              onChange={(event) =>
                setFilters((current) => ({ ...current, endJoinedTime: event.target.value }))
              }
            />
          </div>
          <Select
            value={filters.orderDir}
            onValueChange={(value) => {
              if (!value) return;
              setFilters((current) => ({
                ...current,
                orderDir: value as MemberListFilters["orderDir"],
              }));
            }}
          >
            <SelectTrigger className="w-28" aria-label="排序方式">
              <SelectValue>{filters.orderDir === "ASC" ? "正序" : "倒序"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DESC">倒序</SelectItem>
              <SelectItem value="ASC">正序</SelectItem>
            </SelectContent>
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
          正在加载成员...
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5 text-muted-foreground" />}
          title="暂无成员"
          description="当前没有符合条件的组织成员。"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>入组时间</TableHead>
                  <TableHead>最近活跃</TableHead>
                  <TableHead>原子任务提交数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-56 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const disabled = member.status === "DISABLED";
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt=""
                              className="size-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                              {memberName(member).slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">
                              {memberName(member)}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {member.username || member.userId}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.orgRole === "ORG_ADMIN" ? "组织管理员" : "普通用户"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.joinedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.lastSubmittedAt)}
                      </TableCell>
                      <TableCell>{member.submitCount}</TableCell>
                      <TableCell>
                        <Badge variant={disabled ? "secondary" : "outline"}>
                          {disabled ? "已禁用" : "已启用"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openRoleDialog(member)}
                          >
                            <ShieldCheck className="size-4" />
                            角色
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSubmitCounts(member)}
                          >
                            <ClipboardList className="size-4" />
                            统计
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={disabled ? "启用成员" : "禁用成员"}
                            title={disabled ? "启用成员" : "禁用成员"}
                            disabled={mutatingId === member.id}
                            className={
                              disabled
                                ? "text-muted-foreground"
                                : "text-destructive hover:bg-destructive/10 hover:text-destructive"
                            }
                            onClick={() => void handleStatusChange(member)}
                          >
                            {mutatingId === member.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : disabled ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <Ban className="size-4" />
                            )}
                            {disabled ? "启用" : "禁用"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      <Dialog open={detailMember !== null} onOpenChange={(open) => !open && setDetailMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detailMember ? `${memberName(detailMember)}的提交统计` : "提交统计"}
            </DialogTitle>
            <DialogDescription>查看该成员按原子任务汇总的提交次数。</DialogDescription>
          </DialogHeader>
          {detailQuery.isError && !detailQuery.data ? (
            <Button onClick={() => void detailQuery.refetch()}>加载失败，重试</Button>
          ) : detailLoading ? (
            <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              正在加载统计...
            </div>
          ) : submitCounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无提交记录</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {submitCounts.map((item) => (
                <div
                  key={item.baseTaskId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="truncate text-foreground">
                    {item.baseTaskName || item.baseTaskId}
                  </span>
                  <span className="shrink-0 font-medium text-muted-foreground">
                    {item.submitCount} 次
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={roleMember !== null} onOpenChange={(open) => !open && setRoleMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整成员角色</DialogTitle>
            <DialogDescription>
              {roleMember ? `为「${memberName(roleMember)}」设置当前组织内的角色。` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="member-role">组织角色</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => {
                if (!value) return;
                setSelectedRole(value as OrgMemberRole);
              }}
            >
              <SelectTrigger id="member-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORG_ADMIN">组织管理员</SelectItem>
                <SelectItem value="ORG_USER">普通用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleMember(null)}
              disabled={savingRole}
            >
              取消
            </Button>
            <Button type="button" onClick={() => void handleRoleChange()} disabled={savingRole}>
              {savingRole && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizationMembersPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationMembersContent />
    </OrganizationAdminGuard>
  );
}
