import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PageContainerSize = "wide" | "content" | "fluid";

const SIZE_CLASSES: Record<PageContainerSize, string> = {
  wide: "w-full",
  content: "mx-auto w-full max-w-[1200px]",
  fluid: "w-full",
};

interface PageContainerProps {
  size?: PageContainerSize;
  className?: string;
  children: ReactNode;
}

export default function PageContainer({
  size = "wide",
  className,
  children,
}: PageContainerProps): ReactElement {
  return (
    <div className={cn("flex min-h-full min-w-0 flex-col", SIZE_CLASSES[size], className)}>
      {children}
    </div>
  );
}
