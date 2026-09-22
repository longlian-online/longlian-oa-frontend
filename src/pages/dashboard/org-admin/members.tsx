import { useEffect, useState } from "react";
import { Ban, CheckCircle2, ClipboardList, Loader2, Search, ShieldCheck, Users } from "lucide-react";

import {
  changeMemberRole,
  changeMemberStatus,
  getMemberSubmitCounts,
  getOrganizationMembers,
  type OrgMemberRole,
} from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
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
import type {
  MemberSubmitCountVO,
  OrganizationMemberListDTO,
  OrganizationMemberVO,
} from "@/types/organizationAdmin";

const PAGE_SIZE = 10;

function memberName(member: OrganizationMemberVO): string {
  return member.nickname || member.username || member.userId;
}

function OrganizationMembersContent() {
  const confirm = useConfirm();
  const [members, setMembers] = useState<OrganizationMemberVO[]>([]);
  const [searchText, setSearchText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [startJoinedTime, setStartJoinedTime] = useState("");
  const [endJoinedTime, setEndJoinedTime] = useState("");
  const [orderDir, setOrderDir] =
    useState<NonNullable<OrganizationMemberListDTO["orderDir"]>>("DESC");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [detailMember, setDetailMember] = useState<OrganizationMemberVO | null>(null);
  const [submitCounts, setSubmitCounts] = useState<MemberSubmitCountVO[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roleMember, setRoleMember] = useState<OrganizationMemberVO | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>("ORG_USER");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    void loadMembers();
  }, [keyword, startJoinedTime, endJoinedTime, orderDir, page]);

  async function loadMembers(): Promise<void> {
    try {
      setLoading(true);
      const result = await getOrganizationMembers({
        pageNum: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        startJoinedTime: startJoinedTime || undefined,
        endJoinedTime: endJoinedTime || undefined,
        orderDir,
      });
      setMembers(result.list);
      setTotal(result.total);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "成员加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  async function handleStatusChange(member: OrganizationMemberVO): Promise<void> {
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

    try {
      setMutatingId(member.id);
      await changeMemberStatus(member.id, disabled ? "ENABLED" : "DISABLED");
      $tip(disabled ? "成员已启用" : "成员已禁用", "success");
      await loadMembers();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "成员状态更新失败", "error");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleOpenSubmitCounts(member: OrganizationMemberVO): Promise<void> {
    setDetailMember(member);
    setSubmitCounts([]);
    try {
      setDetailLoading(true);
      const result = await getMemberSubmitCounts(member.id);
      setSubmitCounts(result.list);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "提交统计加载失败", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  function openRoleDialog(member: OrganizationMemberVO): void {
    setRoleMember(member);
    setSelectedRole(member.orgRole ?? "ORG_USER");
  }

  async function handleRoleChange(): Promise<void> {
    if (!roleMember) return;

    try {
      setSavingRole(true);
      await changeMemberRole(roleMember.id, selectedRole);
      $tip("角色已修改", "success");
      setRoleMember(null);
      await loadMembers();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "角色修改失败", "error");
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">成员管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看组织成员，管理成员状态与组织角色。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索成员"
              className="pl-9"
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            />
          </div>
          <Input
            type="date"
            aria-label="入组开始日期"
            value={startJoinedTime}
            className="w-36"
            onChange={(event) => {
              setStartJoinedTime(event.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            aria-label="入组结束日期"
            value={endJoinedTime}
            className="w-36"
            onChange={(event) => {
              setEndJoinedTime(event.target.value);
              setPage(1);
            }}
          />
          <Select
            value={orderDir}
            onValueChange={(value) => {
              if (!value) return;
              setOrderDir(value as NonNullable<OrganizationMemberListDTO["orderDir"]>);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-28" aria-label="排序方式">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DESC">最新入组</SelectItem>
              <SelectItem value="ASC">最早入组</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
        </div>
      </div>

      {loading ? (
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
                            onClick={() => void handleOpenSubmitCounts(member)}
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
          {detailLoading ? (
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
