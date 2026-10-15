import { useState } from "react";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";

import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";
import { createAdmin, deleteAdmin, getAdminList } from "@/api/admin";
import AdminLayout from "@/components/AdminLayout";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { formatDate } from "@/lib/format";
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

import type { AdminCreateDTO, AdminVO } from "@/types/admin";

const PAGE_SIZE = 10;

export default function AdminsPage() {
  const createAdminMutation = useApiMutation<
    Awaited<ReturnType<typeof createAdmin>>,
    Parameters<typeof createAdmin>
  >({ mutationFn: (args) => createAdmin(...args), invalidate: [["adminAdmins"]], scope: "admin" });
  const deleteAdminMutation = useApiMutation<
    Awaited<ReturnType<typeof deleteAdmin>>,
    Parameters<typeof deleteAdmin>
  >({ mutationFn: (args) => deleteAdmin(...args), invalidate: [["adminAdmins"]], scope: "admin" });
  const [page, setPage] = useState(1);
  const saving = createAdminMutation.isPending || deleteAdminMutation.isPending;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AdminCreateDTO>({ username: "", password: "" });

  const listQuery = useApiQuery({
    key: ["adminAdmins", "management", page],
    queryFn: () => getAdminList({ pageNum: page, pageSize: PAGE_SIZE }),
    scope: "admin",
  });
  const admins = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;

  async function handleCreate(): Promise<void> {
    try {
      if (!form.username.trim() || form.password.length < 6) {
        $tip("请输入账号和至少 6 位密码", "error");
        return;
      }
      await createAdminMutation.mutateAsync([
        { username: form.username.trim(), password: form.password },
      ]);
      $tip("管理员已创建", "success");
      setDialogOpen(false);
      setForm({ username: "", password: "" });
      setPage(1);
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  async function handleDelete(admin: AdminVO): Promise<void> {
    try {
      if (!window.confirm(`确定删除管理员「${admin.username}」吗？`)) return;
      await deleteAdminMutation.mutateAsync([admin.id]);
      $tip("管理员已删除", "success");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  return (
    <AdminLayout title="管理员管理" description="维护系统管理员账号与登录权限。">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">共 {total} 位管理员</div>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              新增管理员
            </Button>
          </div>
          {listQuery.isError && !listQuery.data ? (
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              加载失败，重试
            </Button>
          ) : loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载中...
            </div>
          ) : admins.length === 0 ? (
            <EmptyState
              icon={<UserRound className="size-5 text-muted-foreground" />}
              title="暂无管理员"
              description="创建一个系统管理员开始使用管理端。"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>账号</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{admin.role}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(admin.createdAt)}</TableCell>
                      <TableCell>{formatDate(admin.lastLoginAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void handleDelete(admin)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                          删除
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增管理员</DialogTitle>
            <DialogDescription>创建后即可使用账号密码登录系统管理端。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="管理员账号"
              maxLength={32}
            />
            <Input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="密码（至少 6 位）"
              maxLength={64}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              {saving && <Loader2 className="size-4 animate-spin" />}创建管理员
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
