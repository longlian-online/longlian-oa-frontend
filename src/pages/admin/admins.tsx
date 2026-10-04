import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";

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
  const [admins, setAdmins] = useState<AdminVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AdminCreateDTO>({ username: "", password: "" });

  async function loadAdmins(nextPage = page): Promise<void> {
    try {
      setLoading(true);
      const result = await getAdminList({ pageNum: nextPage, pageSize: PAGE_SIZE });
      setAdmins(result.list ?? []);
      setTotal(result.total ?? 0);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "管理员列表加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdmins();
  }, [page]);

  async function handleCreate(): Promise<void> {
    if (!form.username.trim() || form.password.length < 6) {
      $tip("请输入账号和至少 6 位密码", "error");
      return;
    }
    try {
      setSaving(true);
      await createAdmin({ username: form.username.trim(), password: form.password });
      $tip("管理员已创建", "success");
      setDialogOpen(false);
      setForm({ username: "", password: "" });
      setPage(1);
      await loadAdmins(1);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "管理员创建失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(admin: AdminVO): Promise<void> {
    if (!window.confirm(`确定删除管理员「${admin.username}」吗？`)) return;
    try {
      await deleteAdmin(admin.id);
      $tip("管理员已删除", "success");
      await loadAdmins();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "管理员删除失败", "error");
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
          {loading ? (
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
