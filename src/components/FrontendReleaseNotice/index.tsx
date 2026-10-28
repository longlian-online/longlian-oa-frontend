import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { dismissReleaseNotice, subscribeReleaseNotice } from "@/lib/frontendReleaseWatch";

import type { ReactElement, ReactNode } from "react";

export default function FrontendReleaseNotice(): ReactElement | null {
  const [buildTime, setBuildTime] = useState<string | null>(null);

  useEffect(() => subscribeReleaseNotice(setBuildTime), []);

  if (buildTime === null) return null;

  const bar: ReactNode = (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-center gap-3 border-b bg-background px-4 text-sm"
    >
      <p>页面已更新，刷新后继续使用</p>
      <Button type="button" size="sm" onClick={() => window.location.reload()}>
        刷新
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="关闭"
        onClick={() => dismissReleaseNotice(buildTime)}
      >
        <X />
      </Button>
    </div>
  );

  return (
    <>
      <div className="h-12 shrink-0" />
      {typeof document === "undefined" ? bar : createPortal(bar, document.body)}
    </>
  );
}
