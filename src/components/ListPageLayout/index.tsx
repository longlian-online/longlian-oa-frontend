import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListPageLayoutProps {
  children: ReactNode;
  className?: string;
  "aria-busy"?: boolean;
}

export default function ListPageLayout({
  children,
  className,
  "aria-busy": ariaBusy,
}: ListPageLayoutProps): ReactElement {
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-5", className)}
      aria-busy={ariaBusy}
    >
      {children}
    </div>
  );
}
