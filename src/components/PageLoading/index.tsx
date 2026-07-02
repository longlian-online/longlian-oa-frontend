import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export default function PageLoading({ message = "加载中...", className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
