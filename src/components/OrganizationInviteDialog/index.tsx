import { useState } from "react";
import { Copy, Loader2, RefreshCw, Ticket } from "lucide-react";

import { createJoinInviteCode } from "@/api/organizationAdmin";
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
import { formatDate } from "@/lib/format";
import type { InviteCodeVO } from "@/types/organizationAdmin";

export default function OrganizationInviteDialog(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState<InviteCodeVO | null>(null);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);

  async function handleCreate(): Promise<void> {
    setLoading(true);
    setInvite(null);
    try {
      const nextInvite = await createJoinInviteCode();
      setInvite(nextInvite);
      $tip("邀请码已生成", "success");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "邀请码生成失败", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (!invite?.inviteCode) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(invite.inviteCode);
      $tip("邀请码已复制", "success");
    } catch {
      $tip("复制失败，请手动复制邀请码", "error");
    } finally {
      setCopying(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={loading}
        onClick={() => {
          setOpen(true);
          if (!invite) void handleCreate();
        }}
      >
        <Ticket data-icon="inline-start" />
        生成邀请码
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀请成员</DialogTitle>
            <DialogDescription>生成一次性邀请码，邀请用户加入当前组织。</DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在生成邀请码...
            </div>
          ) : invite?.inviteCode ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                <code className="select-all break-all text-xl font-semibold tracking-widest text-foreground">
                  {invite.inviteCode}
                </code>
                <Button variant="outline" disabled={copying} onClick={() => void handleCopy()}>
                  <Copy data-icon="inline-start" />
                  复制
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                有效期至 {formatDate(invite.expireAt)}
              </p>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">暂无邀请码，请重新生成。</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              关闭
            </Button>
            <Button variant="outline" disabled={loading} onClick={() => void handleCreate()}>
              <RefreshCw data-icon="inline-start" />
              重新生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
