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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) =>
                event.key === "Enter" && onSearchSubmit?.()
              }
              className="h-9 rounded-md border-input bg-background pl-10"
            />
          </div>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
