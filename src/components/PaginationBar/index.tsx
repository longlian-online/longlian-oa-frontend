import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  /** 显式传入总页数；不传时按 ceil(total/pageSize) 估算（适用于每页条数恒定的列表）。 */
  totalPages?: number;
  disabled?: boolean;
  className?: string;
  onPageChange: (page: number) => void;
  onPagePrefetch?: (page: number) => void;
}

type PaginationItem = number | "gap";

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  const start = Math.max(2, Math.min(currentPage - 1, totalPages - 2));
  const end = Math.min(totalPages - 1, Math.max(3, currentPage + 1));

  if (start === 3) {
    items.push(2);
  } else if (start > 3) {
    items.push("gap");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end === totalPages - 2) {
    items.push(totalPages - 1);
  } else if (end < totalPages - 2) {
    items.push("gap");
  }

  items.push(totalPages);
  return items;
}

export default function PaginationBar({
  page,
  pageSize,
  total,
  totalPages: totalPagesProp,
  disabled = false,
  className,
  onPageChange,
  onPagePrefetch,
}: PaginationBarProps) {
  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);

  if (totalPages <= 1) {
    return null;
  }

  function prefetch(targetPage: number): void {
    if (disabled || targetPage === normalizedPage || targetPage < 1 || targetPage > totalPages) {
      return;
    }
    onPagePrefetch?.(targetPage);
  }

  return (
    <div className={cn("flex justify-center pt-2", className)}>
      <nav aria-label="分页" className="flex h-9 items-center gap-1.5 tabular-nums">
        <Button
          type="button"
          variant="ghost"
          disabled={normalizedPage <= 1 || disabled}
          onClick={() => onPageChange(normalizedPage - 1)}
          onMouseEnter={() => prefetch(normalizedPage - 1)}
          onFocus={() => prefetch(normalizedPage - 1)}
          className="h-9 gap-1.5 rounded-full px-3 text-sm font-normal text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft data-icon="inline-start" />
          上一页
        </Button>

        <div className="flex h-9 items-center gap-1">
          {getPaginationItems(normalizedPage, totalPages).map((item, index) =>
            item === "gap" ? (
              <span
                key={`gap-${index}`}
                className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={() => onPageChange(item)}
                onMouseEnter={() => prefetch(item)}
                onFocus={() => prefetch(item)}
                className={
                  item === normalizedPage
                    ? "h-9 min-w-9 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    : "h-9 min-w-9 rounded-full px-3 text-sm font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              >
                {item}
              </Button>
            ),
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          disabled={normalizedPage >= totalPages || disabled}
          onClick={() => onPageChange(normalizedPage + 1)}
          onMouseEnter={() => prefetch(normalizedPage + 1)}
          onFocus={() => prefetch(normalizedPage + 1)}
          className="h-9 gap-1.5 rounded-full px-3 text-sm font-normal text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          下一页
          <ChevronRight data-icon="inline-end" />
        </Button>
      </nav>
    </div>
  );
}
