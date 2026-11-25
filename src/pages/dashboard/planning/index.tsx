import { Popover } from "@base-ui/react/popover";
import { useEffect, useId, useState, type ReactElement } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowRight, Clock, Filter, FolderOpen, Plus, UserRound } from "lucide-react";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { usePageQuery } from "@/hooks/usePageQuery";
import { PLANNING_PAGE_SIZE as PAGE_SIZE, projectListQuery } from "@/queries/planning";
import EmptyState from "@/components/EmptyState";
import FilterSelectContent from "@/components/FilterSelectContent";
import FilterToolbar from "@/components/FilterToolbar";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import ProjectCardTags from "@/components/ProjectCardTags";
import RemoteImage from "@/components/RemoteImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import { formatDate } from "@/lib/format";
import { parseProjectMetadataTags } from "@/lib/projectMetadata";
import { readPlanningListView, withPlanningListFilters } from "@/lib/planningListView";

import type { ProjectInfoVO } from "@/types/planning";

const timeSortOptions = [
  { value: "CREATE-DESC", label: "最新创建" },
  { value: "CREATE-ASC", label: "最早创建" },
  { value: "UPDATE-DESC", label: "最近更新" },
  { value: "UPDATE-ASC", label: "最早更新" },
] as const;

// 配合 1680px 宽容器：半屏 2 列、常规大屏 3 列、超宽大屏 4 列，保持舒展展柜比例。
const PROJECT_CARD_GRID_CLASS =
  "grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 min-[1720px]:grid-cols-4";

export default function Planning() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectTypes } = useProjectTypes();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    pageNum,
    keyword: submittedKeyword,
    selectedType,
    timeSort,
  } = readPlanningListView(searchParams);
  const [keyword, setKeyword] = useState(submittedKeyword);
  const [, setPageNum] = usePageQuery();
  useEffect(() => setKeyword(submittedKeyword), [submittedKeyword]);

  const listQuery = useApiQuery(
    projectListQuery(pageNum, submittedKeyword, selectedType, timeSort),
  );
  const projects = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  const totalPages =
    total <= PAGE_SIZE - 1 ? 1 : 1 + Math.ceil((total - (PAGE_SIZE - 1)) / PAGE_SIZE);
  function handleSearch(): void {
    setSearchParams(withPlanningListFilters(searchParams, { keyword }), {
      preventScrollReset: true,
      state: location.state,
    });
    if (submittedKeyword === keyword.trim() && pageNum === 1) void listQuery.refetch();
  }

  return (
    <div className="space-y-6">
      {listQuery.isFetching && listQuery.data && (
        <p role="status" className="text-sm text-muted-foreground">
          正在刷新...
        </p>
      )}

      <FilterToolbar
        searchValue={keyword}
        searchPlaceholder="搜索企划..."
        onSearchChange={setKeyword}
        onSearchSubmit={handleSearch}
        actions={
          <>
            <Select
              value={`${timeSort.sortByTime}-${timeSort.orderDir}`}
              onValueChange={(value: string | null) => {
                const [sortByTime, orderDir] = value?.split("-") ?? [];
                if (
                  (sortByTime === "CREATE" || sortByTime === "UPDATE") &&
                  (orderDir === "DESC" || orderDir === "ASC")
                ) {
                  setSearchParams(
                    withPlanningListFilters(searchParams, { timeSort: { sortByTime, orderDir } }),
                    { preventScrollReset: true, state: location.state },
                  );
                }
              }}
            >
              <SelectTrigger className="h-9 w-36 shrink-0 rounded-full border-0 bg-transparent px-3 text-sm text-muted-foreground shadow-none transition-colors hover:bg-secondary/70 hover:text-foreground focus:ring-0 focus:ring-offset-0 dark:bg-transparent">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue>
                  {timeSortOptions.find(
                    (option) => option.value === `${timeSort.sortByTime}-${timeSort.orderDir}`,
                  )?.label ?? "时间"}
                </SelectValue>
              </SelectTrigger>
              <FilterSelectContent>
                {timeSortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </FilterSelectContent>
            </Select>
            <Select
              value={selectedType}
              onValueChange={(value: string | null) => {
                if (value) {
                  setSearchParams(withPlanningListFilters(searchParams, { selectedType: value }), {
                    preventScrollReset: true,
                    state: location.state,
                  });
                }
              }}
            >
              <SelectTrigger className="h-9 w-36 shrink-0 rounded-full border-0 bg-transparent px-3 text-sm text-muted-foreground shadow-none transition-colors hover:bg-secondary/70 hover:text-foreground focus:ring-0 focus:ring-offset-0 dark:bg-transparent">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue>
                  {selectedType === "all"
                    ? "所有类型"
                    : (projectTypes.find((type) => type.name === selectedType)?.name ??
                      selectedType)}
                </SelectValue>
              </SelectTrigger>
              <FilterSelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                {projectTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </FilterSelectContent>
            </Select>
          </>
        }
      />

      {listQuery.isError && !listQuery.data ? (
        <div role="alert">
          {listQuery.error.message}
          <Button onClick={() => void listQuery.refetch()}>重试</Button>
        </div>
      ) : loading ? (
        <PageLoading message="正在加载企划..." />
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="@container">
              <div className="grid min-w-0 gap-4 @min-[41rem]:grid-cols-[20rem_minmax(0,1fr)]">
                <CreateProjectCard />
                <EmptyState
                  icon={<FolderOpen className="h-5 w-5 text-muted-foreground" />}
                  title="还没有企划"
                  description="创建第一个企划后，团队成员就可以围绕项目推进任务流。"
                  action={
                    <Button
                      onClick={() =>
                        navigate("/dashboard/planning/create", {
                          state: {
                            ...location.state,
                            planningListReturnTo: `${location.pathname}${location.search}`,
                          },
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      创建企划
                    </Button>
                  }
                  className="h-full"
                />
              </div>
            </div>
          ) : (
            <div className={PROJECT_CARD_GRID_CLASS}>
              {pageNum === 1 && <CreateProjectCard />}
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          <PaginationBar
            page={pageNum}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            disabled={loading}
            onPageChange={setPageNum}
          />
        </>
      )}
    </div>
  );
}

function CreateProjectCard() {
  const location = useLocation();
  return (
    <Link
      to="/dashboard/planning/create"
      state={{ ...location.state, planningListReturnTo: `${location.pathname}${location.search}` }}
      className="group flex aspect-[5/3] min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4 transition-all duration-200 hover:border-foreground/25 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors duration-200 group-hover:bg-accent-soft group-hover:text-accent-soft-foreground">
        <Plus className="size-5" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
          创建新企划
        </p>
      </div>
    </Link>
  );
}

interface ProjectCardProps {
  project: ProjectInfoVO;
}

function ProjectCard({ project }: ProjectCardProps): ReactElement {
  const location = useLocation();
  const [ownerOpen, setOwnerOpen] = useState(false);
  const ownerTriggerId = useId();
  const metadataTags = parseProjectMetadataTags(project.metadata);
  const detailTo = `/dashboard/planning/${project.id}?view=about`;
  const detailState = {
    ...location.state,
    planningListReturnTo: `/dashboard/planning${location.search}`,
  };
  const ownerNickname = project.creatorNickname?.trim() || "未设置昵称";
  const ownerInitial = project.creatorNickname?.trim().slice(0, 1);

  return (
    <article
      aria-label={project.title}
      className="group/card flex aspect-[5/3] min-h-52 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_3px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] duration-200 hover:border-foreground/18 hover:shadow-[0_6px_20px_rgb(0_0_0/0.06)] dark:shadow-none dark:hover:border-foreground/22"
    >
      <Link
        to={detailTo}
        state={detailState}
        aria-label={`查看企划：${project.title}（封面）`}
        className="relative h-full w-[40%] shrink-0 overflow-hidden bg-muted outline-none after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-foreground/8 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {project.coverUrl ? (
          <RemoteImage
            src={project.coverUrl}
            alt={project.title}
            className="size-full transition-transform duration-300 ease-out motion-safe:group-hover/card:scale-[1.03]"
            fallback={
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-secondary text-2xl font-semibold tracking-tight text-muted-foreground/75">
                {project.title.slice(0, 2)}
              </div>
            }
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-secondary text-2xl font-semibold tracking-tight text-muted-foreground/75">
            {project.title.slice(0, 2)}
          </div>
        )}
      </Link>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
        <div className="flex shrink-0 items-start justify-between gap-2">
          <h3
            title={project.title}
            className="min-w-0 flex-1 truncate text-base font-semibold leading-6 tracking-[-0.01em] text-foreground"
          >
            {project.title}
          </h3>
          <Badge
            variant="outline"
            className="h-5.5 shrink-0 rounded-full border-border/80 bg-secondary/60 px-2 text-[11px] font-normal text-muted-foreground"
          >
            {project.projectType}
          </Badge>
        </div>

        <p className="mt-2 line-clamp-2 min-h-10 shrink-0 text-[13px] leading-5 text-muted-foreground">
          {project.description || "暂无简介"}
        </p>

        <ProjectCardTags tags={metadataTags} />

        <div className="mt-auto flex shrink-0 items-center gap-2.5 pt-3">
          <Popover.Root
            open={ownerOpen}
            onOpenChange={setOwnerOpen}
            triggerId={ownerOpen ? ownerTriggerId : null}
          >
            <Popover.Trigger
              id={ownerTriggerId}
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) setOwnerOpen(true);
              }}
              openOnHover
              delay={150}
              closeDelay={200}
              aria-label={`负责人信息：${ownerNickname}`}
              className="group/owner relative size-9 shrink-0 cursor-default rounded-full outline-none data-popup-open:z-60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Avatar className="size-9 ring-1 ring-border/60 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-popup-open/owner:ring-3 group-data-popup-open/owner:ring-popover motion-safe:group-hover/owner:scale-135 motion-safe:group-focus-visible/owner:scale-135 motion-safe:group-data-popup-open/owner:scale-135 motion-reduce:transition-none">
                <AvatarImage src={project.creatorAvatarUrl} alt="" />
                <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                  {ownerInitial || <UserRound className="size-4" />}
                </AvatarFallback>
              </Avatar>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                side="bottom"
                align="start"
                sideOffset={-18}
                alignOffset={18}
                collisionPadding={16}
                collisionAvoidance={{ side: "flip", align: "flip", fallbackAxisSide: "none" }}
                className="z-50"
              >
                <Popover.Popup
                  initialFocus={false}
                  className="group/owner-panel w-60 max-w-[calc(100vw-2rem)] origin-top-left rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[align=end]:origin-top-right data-[side=top]:origin-bottom-left data-[side=top]:data-[align=end]:origin-bottom-right data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-150 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95 motion-reduce:transition-none"
                >
                  <div className="space-y-2.5 transition-opacity delay-50 duration-150 group-data-starting-style/owner-panel:opacity-0 group-data-ending-style/owner-panel:opacity-0 group-data-ending-style/owner-panel:delay-0 group-data-ending-style/owner-panel:duration-100 motion-reduce:transition-none">
                    <div>
                      <p className="text-xs text-muted-foreground">昵称</p>
                      <Popover.Title className="mt-0.5 break-all text-sm font-medium">
                        {ownerNickname}
                      </Popover.Title>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">最近提交</p>
                      <Popover.Description className="mt-0.5 text-xs leading-5 tabular-nums text-muted-foreground">
                        {project.creatorLastSubmittedAt
                          ? formatDate(project.creatorLastSubmittedAt)
                          : "暂无提交记录"}
                      </Popover.Description>
                    </div>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <Link
            to={detailTo}
            state={detailState}
            aria-label={`查看企划：${project.title}`}
            className="group/cta ml-auto inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-accent-soft-border bg-accent-soft py-1 pl-3 pr-1.5 text-xs font-medium text-accent-soft-foreground outline-none transition-colors duration-150 hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            查看企划
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-current/12">
              <ArrowRight
                aria-hidden="true"
                className="size-3.5 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover/cta:translate-x-0.5"
              />
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
