import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { ApiError } from "@/api/apiError";
import { markProductReleaseSeen } from "@/api/productRelease";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { formatProductVersion } from "@/lib/productRelease";
import { currentProductReleaseQuery } from "@/queries/productRelease";
import ReleaseMarkdown from "@/components/ReleaseMarkdown";

import type { ReactElement } from "react";

export default function ProductReleaseNotice(): ReactElement | null {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const query = useApiQuery(currentProductReleaseQuery());
  const release = query.data?.release ?? null;
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const onHistory = pathname.startsWith("/dashboard/updates");
  const open = Boolean(release) && hiddenId !== release?.id && !onHistory;

  async function dismiss(toHistory: boolean): Promise<void> {
    if (!release || hiddenId === release.id) {
      if (toHistory) void navigate("/dashboard/updates");
      return;
    }
    setHiddenId(release.id);
    try {
      await markProductReleaseSeen(release.id);
    } catch (error) {
      if (error instanceof ApiError) error.silence();
    }
    if (toHistory) void navigate("/dashboard/updates");
  }

  if (!release) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void dismiss(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{formatProductVersion(release.version)}</DialogTitle>
          <DialogDescription>{release.summary}</DialogDescription>
        </DialogHeader>
        <ReleaseBody content={release.content} olderCount={query.data?.olderCount ?? 0} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => void dismiss(true)}>
            以往更新
          </Button>
          <Button type="button" onClick={() => void dismiss(false)}>
            知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseBody({
  content,
  olderCount,
}: {
  content: string;
  olderCount: number;
}): ReactElement {
  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto">
      <ReleaseMarkdown text={content} />
      {olderCount > 0 ? (
        <p className="text-sm text-muted-foreground">另有 {olderCount} 条更早的更新</p>
      ) : null}
    </div>
  );
}
