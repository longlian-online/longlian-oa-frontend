import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowDownUp, ChevronRight, Search, Workflow } from "lucide-react";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { WORKSHOP_PAGE_SIZE as PAGE_SIZE, workshopListQuery } from "@/queries/workshop";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import { WorkshopProjectCard } from "@/components/Workshop";
import { MyTaskColumn } from "@/components/Workshop/MyTaskColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import { useWorkshopPosition } from "@/hooks/useWorkshopPosition";
import { readWorkshopView } from "@/lib/workshopNavigation";
import type { MyTaskSortDirection } from "@/types/myTask";
import type { WorkshopProjectInfoVO, WorkshopSortBy } from "@/types/workshop";

const TASK_SORT_LABELS: Record<MyTaskSortDirection, string> = {
  ASC: "最早接取",
  DESC: "最近接取",
};
const SORT_LABELS: Record<WorkshopSortBy, string> = {
  RECENT_SUBMISSION: "最近提交",
  CREATED_DESC: "最新创建",
  CREATED_ASC: "最早创建",
};

export default function WorkshopPage() {
  const navigate = useNavigate();
  const { projectTypes } = useProjectTypes();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { keyword, selectedType, isMyCreated, taskSort, sortBy, page, submitPage, waitingPage } =
    readWorkshopView(searchParams);
  const [searchText, setSearchText] = useState(keyword);
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: false });
  const rootRef = useWorkshopPosition();

  function updateView(values: Record<string, string | number | null>): void {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === "" || value === 1) next.delete(key);
      else next.set(key, String(value));
    }
    setSearchParams(next, { preventScrollReset: true });
  }

  useEffect(() => setSearchText(keyword), [keyword]);

  const listQuery = useApiQuery(
    workshopListQuery(page, keyword, selectedType, isMyCreated, sortBy),
  );
  const projects = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  useEffect(() => {
    const group = document.querySelector<HTMLDivElement>('[aria-label="企划类型筛选"]');
    if (!group) return;
    const update = (): void => {
      setScrollState({
        atStart: group.scrollLeft <= 1,
        atEnd: group.scrollLeft + group.clientWidth >= group.scrollWidth - 1,
      });
    };
    update();
    group.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(group);
    return () => {
      group.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [projectTypes]);

  function handleSearch(): void {
    updateView({ keyword: searchText.trim(), page: 1 });
  }

  function handleOpenWorkflow(project: WorkshopProjectInfoVO): void {
    void navigate(`/dashboard/planning/${project.id}/items`, {
      state: { workshopReturnTo: `${location.pathname}${location.search}` },
    });
  }

  function handleOpenProject(project: WorkshopProjectInfoVO): void {
    void navigate(`/dashboard/planning/${project.id}`, {
      state: { workshopReturnTo: `${location.pathname}${location.search}` },
    });
  }

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <h1 className="text-xl font-bold text-foreground">工坊</h1>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">待办</h2>
          <Select
            value={taskSort}
            onValueChange={(value: string | null) => {
              if (value !== "ASC" && value !== "DESC") return;
              updateView({ taskSort: value, submitPage: 1, waitingPage: 1 });
            }}
          >
            <SelectTrigger aria-label="待办排序" className="h-8 w-36 shrink-0">
              <ArrowDownUp className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue>{TASK_SORT_LABELS[taskSort]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
          <MyTaskColumn
            bucket="SUBMITTABLE"
            title="可提交"
            dotClassName="bg-emerald-600"
            sortDirection={taskSort}
            page={submitPage}
            onPageChange={(next) => updateView({ submitPage: next })}
          />
          <MyTaskColumn
            bucket="WAITING"
            title="等待中"
            dotClassName="bg-amber-600"
            sortDirection={taskSort}
            page={waitingPage}
            onPageChange={(next) => updateView({ waitingPage: next })}
          />
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">企划</h2>
          <Select
            value={sortBy}
            onValueChange={(value: string | null) => {
              if (
                value !== "RECENT_SUBMISSION" &&
                value !== "CREATED_DESC" &&
                value !== "CREATED_ASC"
              )
                return;
              updateView({ sort: value, page: 1 });
            }}
          >
            <SelectTrigger aria-label="企划排序" className="h-8 w-36 shrink-0">
              <ArrowDownUp className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue>{SORT_LABELS[sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <div
              role="group"
              aria-label="企划类型筛选"
              className="flex min-w-0 items-center gap-2 overflow-x-auto py-1"
            >
              <Button
                type="button"
                variant={selectedType === "all" ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0 whitespace-nowrap"
                aria-pressed={selectedType === "all"}
                onClick={() => {
                  updateView({ type: null, page: 1 });
                }}
              >
                所有类型
              </Button>
              {projectTypes.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  variant={selectedType === type.name ? "secondary" : "ghost"}
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                  aria-pressed={selectedType === type.name}
                  onClick={() => {
                    updateView({ type: type.name, page: 1 });
                  }}
                >
                  {type.name}
                </Button>
              ))}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/80 to-transparent transition-opacity duration-200"
              style={{ opacity: scrollState.atEnd ? 0 : 1 }}
            />
            <button
              type="button"
              aria-label="向右滚动类型"
              className="absolute right-0 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition-opacity duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none"
              disabled={scrollState.atEnd}
              style={{ opacity: scrollState.atEnd ? 0 : 1 }}
              onClick={() => {
                const group = document.querySelector<HTMLDivElement>('[aria-label="企划类型筛选"]');
                group?.scrollBy({ left: 160, behavior: "smooth" });
              }}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <Button
            type="button"
            variant={isMyCreated ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            aria-pressed={isMyCreated}
            onClick={() => {
              updateView({ mine: isMyCreated ? null : "1", page: 1 });
            }}
          >
            我创建的
          </Button>

          <div className="relative w-28 shrink-0 sm:w-48 lg:w-64">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="搜索企划"
              aria-label="搜索企划"
              className="h-8 rounded-lg bg-secondary pl-9 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleSearch}
          >
            搜索
          </Button>
        </div>

        {loading ? (
          <PageLoading message="正在加载工坊企划..." />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Workflow className="h-5 w-5 text-muted-foreground" />}
            title="暂无工坊企划"
            description="在企划详情中加入企划后，这里会展示可浏览的企划。"
            action={
              <Button onClick={() => void navigate("/dashboard/planning")}>去企划列表</Button>
            }
          />
        ) : (
          <>
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <WorkshopProjectCard
                  key={project.id}
                  project={project}
                  onOpenWorkflow={handleOpenWorkflow}
                  onOpenProject={handleOpenProject}
                />
              ))}
            </div>

            {total > PAGE_SIZE && (
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                disabled={loading}
                onPageChange={(next) => updateView({ page: next })}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
