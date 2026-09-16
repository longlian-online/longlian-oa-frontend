import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  className?: string;
  onPageChange: (page: number) => void;
}

type PaginationItem = number | "gap";

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "gap", totalPages - 1, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "gap", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "gap", currentPage - 1, currentPage, currentPage + 1, "gap", totalPages];
}

export default function PaginationBar({
  page,
  pageSize,
  total,
  disabled = false,
  className,
  onPageChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);

  if (total <= pageSize) {
    return null;
  }

  return (
    <div className={cn("flex justify-center pt-2", className)}>
      <nav aria-label="分页" className="flex h-[38px] items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={normalizedPage <= 1 || disabled}
          onClick={() => onPageChange(normalizedPage - 1)}
          className="h-8 w-24 gap-2 rounded-lg px-3 py-2 text-base font-normal text-muted-foreground disabled:opacity-100"
        >
          <ChevronLeft data-icon="inline-start" />
          上一页
        </Button>

        <div className="flex h-[38px] items-center gap-2">
          {getPaginationItems(normalizedPage, totalPages).map((item, index) =>
            item === "gap" ? (
              <span
                key={`gap-${index}`}
                className="flex h-[38px] min-w-[47px] items-center justify-center rounded-lg px-4 py-2 text-base text-foreground"
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
                className={
                  item === normalizedPage
                    ? "h-8 min-w-8 rounded-lg bg-foreground px-3 py-2 text-base font-normal text-background hover:bg-foreground hover:text-background"
                    : "h-8 min-w-8 rounded-lg px-3 py-2 text-base font-normal text-foreground hover:bg-secondary"
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
          className="h-8 w-24 gap-2 rounded-lg px-3 py-2 text-base font-normal text-foreground disabled:text-muted-foreground disabled:opacity-100"
        >
          下一页
          <ChevronRight data-icon="inline-end" />
        </Button>
      </nav>
    </div>
  );
}
