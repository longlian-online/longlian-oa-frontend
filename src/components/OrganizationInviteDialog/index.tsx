import { useState } from "react";
import { Copy, Loader2, RefreshCw, Ticket } from "lucide-react";

import { createJoinInviteCode } from "@/api/organizationAdmin";
import InviteExpiryField from "@/components/InviteExpiryField";
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
import { useApiMutation } from "@/hooks/queries/useApiQuery";
import { formatDate } from "@/lib/format";
import { toInviteExpiredAt } from "@/lib/inviteExpiry";
import type { GenerateInviteCodeDTO, InviteCodeVO } from "@/types/organizationAdmin";

export default function OrganizationInviteDialog(): React.JSX.Element {
  const createJoinInviteCodeMutation = useApiMutation<InviteCodeVO, [GenerateInviteCodeDTO]>({
    mutationFn: ([dto]) => createJoinInviteCode(dto),
    invalidate: [],
  });
  const [open, setOpen] = useState(false);
  const [expiredAt, setExpiredAt] = useState("");
  const invite = createJoinInviteCodeMutation.data;
  const loading = createJoinInviteCodeMutation.isPending;
  const [copying, setCopying] = useState(false);
  const selectedExpiry = toInviteExpiredAt(expiredAt);

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (!nextOpen) {
      setExpiredAt("");
      createJoinInviteCodeMutation.reset();
    }
  }

  async function handleCreate(): Promise<void> {
    if (!selectedExpiry) {
      $tip("请选择晚于当前时间的到期时间", "error");
      return;
    }
    try {
      createJoinInviteCodeMutation.reset();
      await createJoinInviteCodeMutation.mutateAsync([{ expiredAt: selectedExpiry }]);
      $tip("邀请码已生成", "success");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
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
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Ticket data-icon="inline-start" />
        生成邀请码
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀请成员</DialogTitle>
            <DialogDescription>
              选择到期时间后生成一次性邀请码，邀请用户加入当前组织。
            </DialogDescription>
          </DialogHeader>
          <InviteExpiryField value={expiredAt} disabled={loading} onChange={setExpiredAt} />
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
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              关闭
            </Button>
            <Button
              variant="outline"
              disabled={loading || !selectedExpiry}
              onClick={() => void handleCreate()}
            >
              <RefreshCw data-icon="inline-start" />
              {invite?.inviteCode ? "重新生成" : "生成邀请码"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
