import { Popover } from "@base-ui/react/popover";
import { useId, useState, type ReactElement } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowRight, Clock, Filter, FolderOpen, Plus, UserRound } from "lucide-react";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { usePageQuery } from "@/hooks/usePageQuery";
import {
  DEFAULT_PROJECT_TIME_SORT as DEFAULT_TIME_SORT,
  PLANNING_PAGE_SIZE as PAGE_SIZE,
  projectListQuery,
} from "@/queries/planning";
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

import type { ProjectInfoVO } from "@/types/planning";

const timeSortOptions = [
  { value: "CREATE-DESC", label: "最新创建" },
  { value: "CREATE-ASC", label: "最早创建" },
  { value: "UPDATE-DESC", label: "最近更新" },
  { value: "UPDATE-ASC", label: "最早更新" },
] as const;

// 单卡至少 20rem（min-h-48 × 5/3），最多 4 列。更宽时拉高卡片，而不是继续加列。
const PROJECT_CARD_GRID_CLASS =
  "grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,max(20rem,calc((100%_-_3rem)_/_4))),1fr))] gap-4";

export default function Planning() {
  const navigate = useNavigate();
  const { projectTypes } = useProjectTypes();
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [timeSort, setTimeSort] = useState(DEFAULT_TIME_SORT);
  const [pageNum, setPageNum] = usePageQuery();

  const listQuery = useApiQuery(
    projectListQuery(pageNum, submittedKeyword, selectedType, timeSort),
  );
  const projects = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  const totalPages =
    total <= PAGE_SIZE - 1 ? 1 : 1 + Math.ceil((total - (PAGE_SIZE - 1)) / PAGE_SIZE);
  function handleSearch(): void {
    setSubmittedKeyword(keyword.trim());
    setPageNum(1);
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
                  setTimeSort({ sortByTime, orderDir });
                  setPageNum(1);
                }
              }}
            >
              <SelectTrigger className="h-9 w-36 shrink-0 border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0">
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
                  setSelectedType(value);
                  setPageNum(1);
                }
              }}
            >
              <SelectTrigger className="h-9 w-36 shrink-0 border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0">
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
                    <Button onClick={() => navigate("/dashboard/planning/create")}>
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
  return (
    <Link
      to="/dashboard/planning/create"
      className="border-input group flex aspect-[5/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-4 transition-colors hover:border-primary hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
        <Plus className="text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="text-center">
        <p className="text-muted-foreground text-sm font-medium transition-colors group-hover:text-foreground">
          创建新企划
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">一同播下百合的种子</p>
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
  const detailState = { planningListReturnTo: `/dashboard/planning${location.search}` };
  const ownerNickname = project.creatorNickname?.trim() || "未设置昵称";

  return (
    <article
      aria-label={project.title}
      className="flex aspect-[5/3] min-h-48 overflow-hidden rounded-lg border bg-card shadow-sm"
    >
      <Link
        to={detailTo}
        state={detailState}
        aria-label={`查看企划：${project.title}（封面）`}
        className="relative h-full w-[40%] shrink-0 overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {project.coverUrl ? (
          <RemoteImage
            src={project.coverUrl}
            alt={project.title}
            className="size-full"
            fallback={<span className="text-2xl font-semibold">{project.title.slice(0, 2)}</span>}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-2xl font-semibold text-muted-foreground">
            {project.title.slice(0, 2)}
          </div>
        )}
      </Link>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
        <div className="flex shrink-0 items-start justify-between gap-2">
          <h3
            title={project.title}
            className="min-w-0 flex-1 truncate text-base font-semibold leading-6 text-foreground"
          >
            {project.title}
          </h3>
          <Badge variant="outline" className="shrink-0 font-normal">
            {project.projectType}
          </Badge>
        </div>

        <p className="mt-2 line-clamp-2 min-h-9 shrink-0 text-xs leading-[18px] text-muted-foreground">
          {project.description || "暂无简介"}
        </p>

        <ProjectCardTags tags={metadataTags} />

        <div className="mt-auto flex shrink-0 items-center gap-2 pt-3">
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
              className="size-9 shrink-0 cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Avatar className="size-9">
                <AvatarImage src={project.creatorAvatarUrl} alt="" />
                <AvatarFallback>
                  <UserRound className="size-4" />
                </AvatarFallback>
              </Avatar>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="start" sideOffset={8}>
                <Popover.Popup
                  initialFocus={false}
                  className="w-60 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none"
                >
                  <div className="flex items-start gap-3">
                    <Avatar size="lg" className="shrink-0">
                      <AvatarImage src={project.creatorAvatarUrl} alt="" />
                      <AvatarFallback>
                        <UserRound className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">昵称</p>
                        <Popover.Title className="mt-1 break-all text-sm font-semibold">
                          {ownerNickname}
                        </Popover.Title>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">最近提交</p>
                        <Popover.Description className="mt-1 text-xs leading-5 text-muted-foreground">
                          {project.creatorLastSubmittedAt
                            ? formatDate(project.creatorLastSubmittedAt)
                            : "暂无提交记录"}
                        </Popover.Description>
                      </div>
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
            className="group/cta ml-auto inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-primary/25 bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary outline-none transition-colors duration-150 hover:border-primary/45 hover:bg-primary/18 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            查看企划
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
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
