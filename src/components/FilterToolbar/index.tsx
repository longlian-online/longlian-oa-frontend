import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterToolbarProps {
  searchValue?: string;
  searchPlaceholder?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
}

export default function FilterToolbar({
  searchValue,
  searchPlaceholder = "搜索...",
  children,
  actions,
  className,
  onSearchChange,
  onSearchSubmit,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {onSearchChange && (
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) =>
                event.key === "Enter" && onSearchSubmit?.()
              }
              className="h-10 rounded-full border-border/75 bg-card/70 pl-10 pr-4 transition-colors hover:border-border focus-visible:bg-card dark:bg-card/60"
            />
          </div>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
