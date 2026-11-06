import { Popover } from "@base-ui/react/popover";
import { useMutationState } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ArrowUpDown,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Filter,
  Sparkles,
} from "lucide-react";

import { scopedKey } from "@/lib/queryKeys";
import { readPage, withPage } from "@/lib/pageQuery";
import {
  plazaListDefaults,
  plazaListChoices,
  plazaPageKeys,
  plazaTaskPageKey,
} from "@/lib/plazaListQueryState";
import { cn } from "@/lib/utils";
import { projectThumbnailSrc } from "@/lib/projectThumbnail";
import { formatSlotLabel } from "@/lib/slotLabel";
import { usePageQuery } from "@/hooks/usePageQuery";
import { useListQueryState, useListSearchDraft } from "@/hooks/useListQueryState";
import { useApiQuery, useApiMutation, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { claimTask } from "@/api/workflowInstance";
import {
  PLAZA_PAGE_SIZE as PAGE_SIZE,
  plazaListQuery,
  plazaTaskTypesQuery,
} from "@/queries/planning";
import EmptyState from "@/components/EmptyState";
import FilterSelectContent from "@/components/FilterSelectContent";
import FilterToolbar from "@/components/FilterToolbar";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import RemoteImage from "@/components/RemoteImage";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectTypes } from "@/hooks/useProjectTypes";

import type { PlazaProjectGroup, PlazaSortBy, PlazaTask } from "@/types/plaza";

const TASK_PAGE_SIZE = 6;
const typeFilterTriggerClassName =
  "h-9 w-max max-w-sm shrink-0 border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

const sortOptions = [
  { value: "WAIT", label: "等待最久" },
  { value: "LATEST", label: "最新发布" },
  { value: "MOST", label: "缺员最多" },
] as const;

const DAY_MS = 86_400_000;

interface StageScopeHelpProps {
  label: string;
  children: string;
}

function StageScopeHelp({ label, children }: StageScopeHelpProps): ReactElement {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  return (
    <Popover.Root open={open} onOpenChange={setOpen} triggerId={open ? triggerId : null}>
      <Popover.Trigger
        id={triggerId}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        openOnHover
        delay={150}
        closeDelay={100}
        aria-label={`${label}说明`}
        render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" />}
      >
        <Info aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" sideOffset={6}>
          <Popover.Popup
            initialFocus={false}
            className="max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-md outline-none"
          >
            <Popover.Title className="sr-only">{label}说明</Popover.Title>
            <Popover.Description>{children}</Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default function TaskPlaza() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, updateQuery] = useListQueryState(
    plazaListDefaults,
    plazaListChoices,
    plazaPageKeys(searchParams),
  );
  const stageScope = filters.stageScope as "ALL" | "CURRENT";
  const [pageNum, setPageNum] = usePageQuery();
  const { projectTypes } = useProjectTypes();
  const [keyword, setKeyword] = useListSearchDraft(filters.keyword);
  const submittedKeyword = filters.keyword;
  const selectedType = filters.projectType;
  const selectedTaskType = filters.taskType;
  const taskTypesQuery = useApiQuery(plazaTaskTypesQuery());
  const taskTypes = taskTypesQuery.data ?? [];
  const sortBy = filters.sortBy as PlazaSortBy;
  const session = useSessionSnapshot();
  const pendingClaims = useMutationState({
    filters: { mutationKey: scopedKey(["claimTask"], "org", session), status: "pending" },
    select: (mutation): string => String(mutation.state.variables),
  });
  const claiming = new Set(pendingClaims);

  const listQuery = useApiQuery(
    plazaListQuery(stageScope, pageNum, submittedKeyword, selectedType, sortBy, selectedTaskType),
  );
  const groups = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  useEffect(() => {
    if (!listQuery.data || listQuery.isFetching) return;
    let next = new URLSearchParams(searchParams);
    for (const group of listQuery.data.list) {
      const key = plazaTaskPageKey(group.projectId);
      const lastPage = Math.max(1, Math.ceil(group.tasks.length / TASK_PAGE_SIZE));
      const page = readPage(next, key);
      if (page > lastPage) next = withPage(next, lastPage, key);
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true, preventScrollReset: true, state: location.state });
    }
  }, [listQuery.data, listQuery.isFetching, searchParams, setSearchParams, location.state]);
  function handleSearch(): void {
    updateQuery({ keyword: keyword.trim() });
    if (submittedKeyword === keyword.trim() && pageNum === 1) void listQuery.refetch();
  }

  const claimMutation = useApiMutation({
    key: ["claimTask"],
    allowConcurrent: true,
    mutationFn: claimTask,
    invalidate: [
      ["plaza"],
      ["flow"],
      ["instances"],
      ["taskDetail"],
      ["myTasks"],
      ["items"],
      ["projects"],
      ["workshop"],
    ],
  });
  const claimLocks = useRef(new Set<string>());
  async function handleClaim(instanceId: string, isCurrentStage: boolean): Promise<void> {
    if (claimLocks.current.has(instanceId)) return;
    claimLocks.current.add(instanceId);
    try {
      const result = await claimMutation.mutateAsync(instanceId);
      const message = isCurrentStage
        ? "接取成功，可在任务详情中提交"
        : "接取成功，等待前置阶段完成后再提交";
      $tip(result.autoJoinedProject === true ? `${message}，已自动加入该企划` : message, "success");
    } catch {
      /* 错误由共享 Mutation 处理。 */
    } finally {
      claimLocks.current.delete(instanceId);
    }
  }

  return (
    <div className="space-y-6">
      {listQuery.isFetching && listQuery.data && (
        <p role="status" className="text-sm text-muted-foreground">
          正在刷新...
        </p>
      )}

      <div>
        <h1 className="text-lg font-semibold text-foreground">任务大厅</h1>
        {!loading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? `共 ${total} 个企划有待接取任务` : "暂无待接取任务"}
          </p>
        )}
      </div>

      <div role="group" aria-label="任务阶段范围" className="flex gap-4 border-b pb-2">
        {(["ALL", "CURRENT"] as const).map((scope) => (
          <div
            key={scope}
            className={cn(
              "flex items-center rounded-lg pr-0.5",
              stageScope === scope && "bg-secondary",
            )}
          >
            <Button
              aria-pressed={stageScope === scope}
              variant="ghost"
              className="pr-0"
              onClick={() => {
                if (scope === stageScope) return;
                updateQuery({ stageScope: scope });
              }}
            >
              {scope === "ALL" ? "全部阶段" : "当前阶段"}
            </Button>
            <StageScopeHelp label={scope === "ALL" ? "全部阶段" : "当前阶段"}>
              {scope === "ALL"
                ? "展示所有阶段的待接取任务；后续阶段可提前接取，需等前置阶段完成后才能提交成果。"
                : "仅展示当前阶段的待接取任务，接取后即可提交成果。"}
            </StageScopeHelp>
          </div>
        ))}
      </div>

      <FilterToolbar
        searchValue={keyword}
        searchPlaceholder="搜索任务或企划..."
        onSearchChange={setKeyword}
        onSearchSubmit={handleSearch}
        actions={
          <>
            <Select
              value={sortBy}
              onValueChange={(value: string | null) => {
                if (value === "WAIT" || value === "LATEST" || value === "MOST") {
                  updateQuery({ sortBy: value });
                }
              }}
            >
              <SelectTrigger
                aria-label="排序"
                className="h-9 w-36 shrink-0 border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0"
              >
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue>
                  {sortOptions.find((option) => option.value === sortBy)?.label ?? "排序"}
                </SelectValue>
              </SelectTrigger>
              <FilterSelectContent>
                {sortOptions.map((option) => (
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
                  updateQuery({ projectType: value });
                }
              }}
            >
              <SelectTrigger aria-label="企划类型" className={typeFilterTriggerClassName}>
                <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                <SelectValue>
                  {selectedType === "all"
                    ? "全部企划类型"
                    : (projectTypes.find((type) => type.name === selectedType)?.name ??
                      selectedType)}
                </SelectValue>
              </SelectTrigger>
              <FilterSelectContent>
                <SelectItem value="all">全部企划类型</SelectItem>
                {projectTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </FilterSelectContent>
            </Select>
            <Select
              value={selectedTaskType}
              disabled={
                taskTypesQuery.isLoading || (taskTypesQuery.isError && !taskTypesQuery.data)
              }
              onValueChange={(value: string | null): void => {
                if (value) {
                  updateQuery({ taskType: value });
                }
              }}
            >
              <SelectTrigger aria-label="任务类型" className={typeFilterTriggerClassName}>
                <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                <SelectValue>
                  {selectedTaskType === "all"
                    ? "全部任务类型"
                    : (taskTypes.find((type) => type.id === selectedTaskType)?.name ?? "任务类型")}
                </SelectValue>
              </SelectTrigger>
              <FilterSelectContent>
                <SelectItem value="all">全部任务类型</SelectItem>
                {taskTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </FilterSelectContent>
            </Select>
          </>
        }
      />

      {taskTypesQuery.isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          任务类型加载失败
          <Button variant="link" size="sm" onClick={() => void taskTypesQuery.refetch()}>
            重试任务类型
          </Button>
        </p>
      )}

      {listQuery.isError && !listQuery.data ? (
        <div role="alert">
          {listQuery.error.message}
          <Button onClick={() => void listQuery.refetch()}>重试</Button>
        </div>
      ) : loading ? (
        <PageLoading message="正在加载任务大厅..." />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5 text-muted-foreground" />}
          title="当前没有待接取任务"
          description="此视图下没有匹配的待接取任务，可以切换视图或调整筛选。"
          action={<Button onClick={() => navigate("/dashboard/planning")}>去广场看看企划</Button>}
        />
      ) : (
        <>
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-3 text-xs font-medium text-muted-foreground">
              <div className="grid min-w-0 flex-1 grid-cols-[1rem_minmax(0,1fr)_5rem_2.5rem] items-center gap-2">
                <span aria-hidden="true" />
                <span>作品</span>
                <span>企划类型</span>
                <span className="text-right">数量</span>
              </div>
              <span className="w-28 shrink-0 text-center">操作</span>
            </div>
            {groups.map((group) => (
              <ProjectGroupSection
                key={`${stageScope}-${selectedTaskType}-${group.projectId}`}
                group={group}
                claiming={claiming}
                onClaim={handleClaim}
              />
            ))}
          </div>

          <PaginationBar
            page={pageNum}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={setPageNum}
          />
        </>
      )}
    </div>
  );
}

interface ProjectGroupSectionProps {
  group: PlazaProjectGroup;
  claiming: Set<string>;
  onClaim: (instanceId: string, isCurrentStage: boolean) => void;
}

function ProjectGroupSection({ group, claiming, onClaim }: ProjectGroupSectionProps): ReactElement {
  const location = useLocation();
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = usePageQuery(plazaTaskPageKey(group.projectId));
  const totalPages = Math.max(1, Math.ceil(group.tasks.length / TASK_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleTasks = group.tasks.slice(
    (currentPage - 1) * TASK_PAGE_SIZE,
    currentPage * TASK_PAGE_SIZE,
  );
  const imageUrl = projectThumbnailSrc(group.thumbnailUrl, group.coverUrl);

  return (
    <section>
      <div className="flex items-center gap-4 rounded-lg transition-colors hover:bg-muted/50 focus-within:bg-muted/50">
        <button
          type="button"
          className="group grid min-w-0 flex-1 cursor-pointer grid-cols-[auto_minmax(0,1fr)_5rem_2.5rem] items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          aria-controls={expanded ? panelId : undefined}
          aria-label={expanded ? `收起${group.title}` : `展开${group.title}`}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
          )}
          <span className="flex min-w-0 items-center gap-3">
            {imageUrl ? (
              <RemoteImage
                src={imageUrl}
                alt={group.title}
                className="size-10 shrink-0 rounded-md border"
                fallback={<span className="text-sm font-semibold">{group.title.slice(0, 2)}</span>}
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">
                {group.title.slice(0, 2)}
              </div>
            )}
            <span
              title={group.title}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground group-hover:underline"
            >
              {group.title}
            </span>
          </span>
          <span className="min-w-0">
            <Badge variant="outline" className="max-w-full font-normal" title={group.typeName}>
              <span className="truncate">{group.typeName}</span>
            </Badge>
          </span>
          <span
            aria-label={`待接取任务数 ${group.pendingCount}`}
            className="text-right text-xs text-muted-foreground tabular-nums"
          >
            {group.pendingCount}
          </span>
        </button>
        <Link
          to={`/dashboard/planning/${group.projectId}`}
          state={{ ...location.state, listReturnTo: location.pathname + location.search }}
          className="group/cta ml-auto inline-flex h-8 w-28 shrink-0 items-center justify-between gap-2 rounded-full border border-primary bg-primary py-1 pl-2.5 pr-1 text-xs font-medium text-primary-foreground outline-none transition-opacity duration-150 hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-primary/30 dark:bg-primary/12 dark:text-primary dark:hover:border-primary/50 dark:hover:bg-primary/20 dark:hover:opacity-100 in-[[data-color-theme=pink]]:border-rose-300/45 in-[[data-color-theme=pink]]:bg-rose-100/70 in-[[data-color-theme=pink]]:text-rose-950 in-[[data-color-theme=pink]]:hover:border-rose-300/70 in-[[data-color-theme=pink]]:hover:bg-rose-100 in-[[data-color-theme=pink]]:hover:opacity-100 dark:in-[[data-color-theme=pink]]:border-rose-300/25 dark:in-[[data-color-theme=pink]]:bg-rose-300/10 dark:in-[[data-color-theme=pink]]:text-rose-100 dark:in-[[data-color-theme=pink]]:hover:border-rose-300/45 dark:in-[[data-color-theme=pink]]:hover:bg-rose-300/16"
        >
          作品详细
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 dark:bg-primary/18 in-[[data-color-theme=pink]]:bg-rose-950/8 dark:in-[[data-color-theme=pink]]:bg-rose-100/12">
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover/cta:translate-x-0.5"
            />
          </span>
        </Link>
      </div>

      {expanded && (
        <>
          <div id={panelId} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleTasks.map((task) => (
              <PlazaTaskCard
                key={task.instanceId}
                group={group}
                task={task}
                claiming={claiming.has(task.instanceId)}
                onClaim={onClaim}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <nav
              aria-label={`${group.title}任务分页`}
              className="mt-3 flex items-center justify-center gap-1"
            >
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="上一页任务"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Select
                value={String(currentPage)}
                onValueChange={(value: string | null): void => {
                  if (value !== null) setPage(Number(value));
                }}
              >
                <SelectTrigger
                  aria-label="选择任务页码"
                  title="选择页码，快速跳转"
                  className="min-w-20"
                >
                  <SelectValue aria-live="polite" aria-atomic="true">
                    {currentPage} / {totalPages}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="center"
                  alignItemWithTrigger={false}
                  className="max-h-[min(16rem,var(--available-height))]"
                >
                  <SelectGroup>
                    {Array.from({ length: totalPages }, (_, index) => (
                      <SelectItem key={index + 1} value={String(index + 1)}>
                        第 {index + 1} 页
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="下一页任务"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

interface PlazaTaskCardProps {
  group: PlazaProjectGroup;
  task: PlazaTask;
  claiming: boolean;
  onClaim: (instanceId: string, isCurrentStage: boolean) => void;
}

function PlazaTaskCard({ group, task, claiming, onClaim }: PlazaTaskCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const slotLabel = formatSlotLabel({
    name: task.nodeName,
    slotIndex: task.slotIndex,
    slotTotal: task.slotTotal,
    serialStep: task.serialStep,
  });

  return (
    <div className="rounded-lg border bg-card p-3 transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm">
      <span className="block truncate text-sm font-medium text-foreground" title={slotLabel}>
        {slotLabel}
      </span>
      <Badge variant="outline" className="mt-1 text-xs font-normal">
        {task.isCurrentStage ? "当前阶段" : "后续阶段"}
      </Badge>

      <button
        type="button"
        onClick={() =>
          navigate(`/dashboard/planning/${group.projectId}/items/${task.itemId}`, {
            state: { ...location.state, listReturnTo: location.pathname + location.search },
          })
        }
        className="mt-1.5 block w-full truncate text-left text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
        title={task.itemTitle}
      >
        {task.itemTitle}
      </button>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{waitLabel(task.createdAt)}</span>
        <Button
          size="sm"
          disabled={claiming}
          onClick={() => onClaim(task.instanceId, task.isCurrentStage)}
        >
          {claiming ? "接取中..." : "接取"}
        </Button>
      </div>
    </div>
  );
}

/** 等待天数文案：后端时间为服务器本地时间，按本地时区换算天数 */
function waitLabel(createdAt: string): string {
  const createdAtMs = new Date(createdAt.replace(" ", "T")).getTime();
  if (Number.isNaN(createdAtMs)) {
    return "";
  }
  const days = Math.max(0, Math.floor((Date.now() - createdAtMs) / DAY_MS));
  return days === 0 ? "今天发布" : `等待 ${days} 天`;
}
