import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Search, ShieldCheck, Users } from "lucide-react";

import {
  changeMemberRole,
  getOrgMemberList,
  resetMemberPassword,
  type OrgMemberInfoVO,
  type OrgMemberRole,
} from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const PAGE_SIZE = 12;

const roleLabels: Record<OrgMemberRole, string> = {
  ORG_ADMIN: "组织管理员",
  ORG_USER: "普通用户",
};

function formatJoinedAt(value?: string): string {
  if (!value) return "—";

  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("zh-CN", { hour12: false });
}

function OrganizationMembersPageContent() {
  const [members, setMembers] = useState<OrgMemberInfoVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [roleMember, setRoleMember] = useState<OrgMemberInfoVO | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>("ORG_USER");
  const [savingRole, setSavingRole] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);

  useEffect(() => {
    void loadMembers();
  }, [keyword, page]);

  async function loadMembers(): Promise<void> {
    try {
      setLoading(true);
      const data = await getOrgMemberList({
        pageNum: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setMembers(data.list);
      setTotal(data.total);
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

  function openRoleDialog(member: OrgMemberInfoVO): void {
    setRoleMember(member);
    setSelectedRole(member.orgRole);
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

  async function handleResetPassword(member: OrgMemberInfoVO): Promise<void> {
    try {
      setResettingId(member.id);
      const data = await resetMemberPassword(member.id);
      setResetPassword(data.password);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "密码重置失败", "error");
    } finally {
      setResettingId(null);
    }
  }

  async function copyResetPassword(): Promise<void> {
    if (!resetPassword) return;

    try {
      await navigator.clipboard.writeText(resetPassword);
      $tip("密码已复制", "success");
    } catch {
      $tip("复制失败，请手动复制", "error");
    }
  }

  function closeResetPasswordDialog(): void {
    setResetPassword(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">用户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理当前组织成员的角色和登录密码。</p>
        </div>
        <div className="flex w-full gap-2 xl:w-auto">
          <div className="relative min-w-0 flex-1 xl:w-64 xl:flex-none">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              placeholder="搜索昵称或用户名"
              className="pl-9"
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoading message="正在加载成员..." />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5 text-muted-foreground" />}
          title="暂无成员"
          description={keyword ? "没有找到匹配的成员。" : "当前组织还没有可管理的成员。"}
        />
      ) : (
        <>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>入组时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarImage src={member.avatarUrl} alt="" />
                          <AvatarFallback>
                            {(member.nickname || member.username).slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {member.nickname || member.username}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {member.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.orgRole === "ORG_ADMIN" ? "default" : "secondary"}>
                        {roleLabels[member.orgRole]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === "ENABLED" ? "default" : "secondary"}>
                        {member.status === "ENABLED" ? "已启用" : "已禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatJoinedAt(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openRoleDialog(member)}>
                          <ShieldCheck data-icon="inline-start" />
                          调整角色
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resettingId === member.id}
                          onClick={() => void handleResetPassword(member)}
                        >
                          {resettingId === member.id ? (
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                          ) : (
                            <KeyRound data-icon="inline-start" />
                          )}
                          重置密码
                        </Button>
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

      <Dialog
        open={roleMember !== null}
        onOpenChange={(open) => {
          if (!open) setRoleMember(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整成员角色</DialogTitle>
            <DialogDescription>
              {roleMember
                ? `为 ${roleMember.nickname || roleMember.username} 设置当前组织内的角色。`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="member-role">组织角色</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as OrgMemberRole)}
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
            <Button variant="outline" onClick={() => setRoleMember(null)} disabled={savingRole}>
              取消
            </Button>
            <Button onClick={() => void handleRoleChange()} disabled={savingRole}>
              {savingRole && <Loader2 data-icon="inline-start" className="animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPassword !== null} onOpenChange={() => undefined}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>密码已重置</DialogTitle>
            <DialogDescription>请立即保存，关闭后无法再次查看。</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-base font-semibold text-foreground">
              {resetPassword}
            </code>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="复制密码"
              title="复制密码"
              onClick={() => void copyResetPassword()}
            >
              <Copy />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={closeResetPasswordDialog}>已保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizationMembersPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationMembersPageContent />
    </OrganizationAdminGuard>
  );
}
