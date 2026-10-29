import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";

import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { itemFlowQuery, projectDetailQuery } from "@/queries/planning";
import { workshopReturnTo } from "@/lib/workshopNavigation";
import { planningListReturnTo } from "@/lib/pageQuery";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

function getBreadcrumbItems(
  pathname: string,
  projectTitle?: string,
  itemTitle?: string,
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "dashboard") return [];

  if (segments[1] === "planning") {
    const items: BreadcrumbItem[] = [{ label: "企划", to: "/dashboard/planning" }];
    if (!segments[2]) return items;
    if (segments[2] === "create") return [...items, { label: "创建企划" }];
    if (segments[2] === "item") return [...items, { label: "项目详情" }];

    const projectPath = `/dashboard/planning/${segments[2]}`;
    items.push({ label: projectTitle ?? "正在加载企划…", to: projectPath });
    if (segments[3] === "items") {
      items.push({ label: "项目列表", to: `${projectPath}/items` });
      if (segments[4] && segments[5] === "workflow") {
        items.push({
          label: itemTitle ?? "正在加载项目…",
          to: `${projectPath}/items/${segments[4]}`,
        });
        items.push({ label: "编辑工作流" });
      } else if (segments[4]) {
        items.push({ label: itemTitle ?? "正在加载项目…" });
      }
    }
    return items;
  }

  if (segments[1] === "workshop") {
    const items: BreadcrumbItem[] = [{ label: "工坊", to: "/dashboard/workshop" }];
    if (segments[2] === "tasks") items.push({ label: "任务" });
    if (segments[2] === "workflows") items.push({ label: "工作流" });
    if (segments[2] === "create") items.push({ label: "创建工作流" });
    return items;
  }

  if (segments[1] === "org-admin") {
    const items: BreadcrumbItem[] = [{ label: "组织管理", to: "/dashboard/org-admin" }];
    if (segments[2] === "projects") items.push({ label: "企划" });
    if (segments[2] === "project-types") items.push({ label: "企划类型" });
    if (segments[2] === "preset-tags") items.push({ label: "标签" });
    if (segments[2] === "preset-fields") items.push({ label: "表单字段" });
    if (segments[2] === "members") items.push({ label: "成员" });
    if (segments[2] === "applications") items.push({ label: "入组申请" });
    if (segments[2] === "deletion-requests") items.push({ label: "删除请求" });
    if (segments[2] === "tasks") items.push({ label: "任务" });
    if (segments[2] === "workflows") items.push({ label: "工作流" });
    if (segments[2] === "create") items.push({ label: "创建工作流" });
    if (segments[2] === "settings") items.push({ label: "组织设置" });
    return items;
  }

  return [];
}

export default function AppBreadcrumb() {
  const location = useLocation();
  const { pathname } = location;
  const segments = pathname.split("/").filter(Boolean);
  const projectId =
    segments[1] === "planning" && segments[2] && !["create", "item"].includes(segments[2])
      ? segments[2]
      : undefined;
  const itemId = projectId && segments[3] === "items" ? segments[4] : undefined;
  const projectQuery = useApiQuery(projectDetailQuery(projectId));
  const flowQuery = useApiQuery(itemFlowQuery(itemId ?? ""));
  const items = getBreadcrumbItems(pathname, projectQuery.data?.title, flowQuery.data?.itemTitle);
  const listReturn = planningListReturnTo(location.state);
  if (listReturn && segments[1] === "planning") {
    const index = items.findIndex((item) => item.to === "/dashboard/planning");
    const current = items[index];
    if (current) items[index] = { ...current, to: listReturn };
  }
  const returnTo = workshopReturnTo(location.state);
  if (returnTo && segments[1] === "planning") items.unshift({ label: "工坊", to: returnTo });
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
                  state={location.state}
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
