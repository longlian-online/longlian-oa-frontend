import { useEffect, useState } from "react";
import { Ban, Building2, CheckCircle2, Copy, KeyRound, Loader2 } from "lucide-react";

import {
  changeAdminOrganizationStatus,
  createOrganizationInviteCode,
  getAdminOrganizations,
} from "@/api/admin";
import AdminLayout from "@/components/AdminLayout";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminInviteCodeVO, AdminOrganizationVO } from "@/types/admin";
import type { OrganizationResourceStatus } from "@/types/organizationAdmin";

const PAGE_SIZE = 10;

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<AdminOrganizationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<AdminInviteCodeVO | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function loadOrganizations(nextPage = page): Promise<void> {
    try {
      setLoading(true);
      const result = await getAdminOrganizations({
        orgName: keyword.trim(),
        pageNum: nextPage,
        pageSize: PAGE_SIZE,
        orderDir: "DESC",
      });
      setOrganizations(result.list ?? []);
      setTotal(result.total ?? 0);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "组织列表加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [page]);

  async function handleSearch(): Promise<void> {
    setPage(1);
    await loadOrganizations(1);
  }

  async function handleStatusChange(organization: AdminOrganizationVO): Promise<void> {
    const nextStatus: OrganizationResourceStatus =
      organization.status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      setWorkingId(organization.id);
      await changeAdminOrganizationStatus(organization.id, nextStatus);
      $tip(nextStatus === "ENABLED" ? "组织已启用" : "组织已禁用", "success");
      await loadOrganizations();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "组织状态更新失败", "error");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleCreateInvite(): Promise<void> {
    try {
      setInvite(await createOrganizationInviteCode());
      setInviteOpen(true);
      $tip("创建组织邀请码已生成", "success");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "邀请码生成失败", "error");
    }
  }

  async function handleCopy(): Promise<void> {
    if (!invite?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(invite.inviteCode);
      $tip("邀请码已复制", "success");
    } catch {
      $tip("复制失败，请手动复制", "error");
    }
  }

  return (
    <AdminLayout title="组织管理" description="查看组织状态，并邀请新的组织接入系统。">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSearch();
                }}
                placeholder="搜索组织名称"
                className="w-56"
              />
              <Button type="button" variant="outline" onClick={() => void handleSearch()}>
                搜索
              </Button>
            </div>
            <Button type="button" onClick={() => void handleCreateInvite()}>
              <KeyRound className="size-4" />
              生成创建邀请码
            </Button>
          </div>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载中...
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-5 text-muted-foreground" />}
              title="暂无组织"
              description="当前没有符合条件的组织。"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>组织</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((organization) => (
                    <TableRow key={organization.id}>
                      <TableCell className="font-medium">{organization.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={organization.status === "ENABLED" ? "default" : "secondary"}
                        >
                          {organization.status === "ENABLED" ? "启用" : "禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(organization.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={organization.status === "DISABLED" ? "启用组织" : "禁用组织"}
                          title={organization.status === "DISABLED" ? "启用组织" : "禁用组织"}
                          disabled={workingId === organization.id}
                          className={
                            organization.status === "DISABLED"
                              ? "text-muted-foreground"
                              : "text-destructive hover:bg-destructive/10 hover:text-destructive"
                          }
                          onClick={() => void handleStatusChange(organization)}
                        >
                          {workingId === organization.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : organization.status === "DISABLED" ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            <Ban className="size-4" />
                          )}
                          {organization.status === "ENABLED" ? "禁用" : "启用"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                disabled={loading}
                onPageChange={setPage}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建组织邀请码</DialogTitle>
            <DialogDescription>
              一次性邀请码有效期至 {formatDate(invite?.expireAt)}。
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <code className="select-all text-2xl font-semibold tracking-[0.3em]">
              {invite?.inviteCode ?? "—"}
            </code>
            <Button type="button" variant="outline" onClick={() => void handleCopy()}>
              <Copy className="size-4" />
              复制
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setInviteOpen(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
