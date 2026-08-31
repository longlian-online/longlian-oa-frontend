import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";

import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "dashboard") return [];

  if (segments[1] === "planning") {
    const items: BreadcrumbItem[] = [{ label: "企划", to: "/dashboard/planning" }];
    if (!segments[2]) return items;
    if (segments[2] === "create") return [...items, { label: "创建企划" }];
    if (segments[2] === "item") return [...items, { label: "项目详情" }];

    const projectPath = `/dashboard/planning/${segments[2]}`;
    items.push({ label: "企划详情", to: projectPath });
    if (segments[3] === "items" && segments[4]) {
      items.push({ label: "项目任务流" });
    }
    return items;
  }

  if (segments[1] === "workshop") {
    const items: BreadcrumbItem[] = [{ label: "工坊", to: "/dashboard/workshop" }];
    if (segments[2] === "tasks") items.push({ label: "原子任务" });
    if (segments[2] === "workflows") items.push({ label: "工作流" });
    if (segments[2] === "create") items.push({ label: "创建工作流" });
    return items;
  }

  return [];
}

export default function AppBreadcrumb() {
  const { pathname } = useLocation();
  const items = getBreadcrumbItems(pathname);

  if (items.length < 2) return null;

  return (
    <nav aria-label="页面路径" className="mb-4 flex min-h-5 items-center overflow-x-auto">
      <ol className="flex min-w-max items-center text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${item.to ?? "current"}`} className="flex items-center">
              {index > 0 && <ChevronRight className="mx-1 size-3 text-muted-foreground/60" />}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && "text-foreground")}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
