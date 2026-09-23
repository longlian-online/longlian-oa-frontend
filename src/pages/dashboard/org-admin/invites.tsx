import { useState } from "react";
import { Check, Clipboard, Copy, Loader2, RefreshCw, Ticket } from "lucide-react";

import { createJoinInviteCode } from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import { $tip } from "@/components/tip";
import { showApiError } from "@/lib/apiError";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { InviteCodeVO } from "@/types/organizationAdmin";

const INVITE_STORAGE_KEY = "organization-admin:join-invite";

function readStoredInvite(): InviteCodeVO | null {
  const rawInvite = sessionStorage.getItem(INVITE_STORAGE_KEY);
  if (!rawInvite) return null;

  try {
    const invite = JSON.parse(rawInvite) as InviteCodeVO;
    return invite.inviteCode ? invite : null;
  } catch {
    sessionStorage.removeItem(INVITE_STORAGE_KEY);
    return null;
  }
}

function OrganizationInvitesContent() {
  const [invite, setInvite] = useState<InviteCodeVO | null>(readStoredInvite);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreate(): Promise<void> {
    try {
      setLoading(true);
      setCopied(false);
      const nextInvite = await createJoinInviteCode();
      setInvite(nextInvite);
      sessionStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(nextInvite));
      $tip("邀请码已生成", "success");
    } catch (error) {
      showApiError(error, "邀请码生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (!invite?.inviteCode) {
      $tip("暂无可复制的邀请码", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(invite.inviteCode);
      setCopied(true);
      $tip("邀请码已复制", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      $tip("复制失败，请手动复制邀请码", "error");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">组织邀请</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          生成一次性邀请码，邀请用户加入当前组织。
        </p>
      </div>

      <div className="max-w-xl rounded-xl border bg-card p-6">
        {invite?.inviteCode ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                <Ticket className="size-5 text-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">邀请码已生成</h2>
                <p className="text-sm text-muted-foreground">
                  该邀请码有效期至 {formatDate(invite.expireAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
              <code className="select-all text-2xl font-semibold tracking-[0.3em] text-foreground">
                {invite.inviteCode}
              </code>
              <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void handleCreate()}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              重新生成
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={<Clipboard className="size-5 text-muted-foreground" />}
            title="暂无邀请码"
            description="生成邀请码后，可将它发送给需要加入组织的用户。"
            action={
              <Button type="button" disabled={loading} onClick={() => void handleCreate()}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                生成邀请码
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

export default function OrganizationInvitesPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationInvitesContent />
    </OrganizationAdminGuard>
  );
}
