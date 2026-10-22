import { Popover } from "@base-ui/react/popover";
import { useMutationState } from "@tanstack/react-query";
import { useId, useRef, useState, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowUpDown, ChevronLeft, ChevronRight, Info, Filter, Sparkles } from "lucide-react";

import { scopedKey } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { projectThumbnailSrc } from "@/lib/projectThumbnail";
import { formatSlotLabel } from "@/lib/slotLabel";
import { usePageQuery } from "@/hooks/usePageQuery";
import { useApiQuery, useApiMutation, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { claimTask } from "@/api/workflowInstance";
import {
  DEFAULT_PLAZA_SORT as DEFAULT_SORT,
  PLAZA_PAGE_SIZE as PAGE_SIZE,
  plazaListQuery,
  plazaStageScope,
} from "@/queries/planning";
import EmptyState from "@/components/EmptyState";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const stageScope = plazaStageScope(searchParams);
  const [pageNum, setPageNum] = usePageQuery();
  const { projectTypes } = useProjectTypes();
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState<PlazaSortBy>(DEFAULT_SORT);
  const session = useSessionSnapshot();
  const pendingClaims = useMutationState({
    filters: { mutationKey: scopedKey(["claimTask"], "org", session), status: "pending" },
    select: (mutation): string => String(mutation.state.variables),
  });
  const claiming = new Set(pendingClaims);

  const listQuery = useApiQuery(
    plazaListQuery(stageScope, pageNum, submittedKeyword, selectedType, sortBy),
  );
  const groups = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  function handleSearch(): void {
    setSubmittedKeyword(keyword.trim());
    setPageNum(1);
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
                const next = new URLSearchParams(searchParams);
                next.set("stageScope", scope);
                next.delete("page");
                setSearchParams(next);
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
                  setSortBy(value);
                  setPageNum(1);
                }
              }}
            >
              <SelectTrigger className="h-9 w-36 shrink-0 border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0">
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue>
                  {sortOptions.find((option) => option.value === sortBy)?.label ?? "排序"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
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
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                {projectTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
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
            {groups.map((group) => (
              <ProjectGroupSection
                key={`${stageScope}-${group.projectId}`}
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
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(group.tasks.length / TASK_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  if (page !== currentPage) setPage(currentPage);
  const visibleTasks = group.tasks.slice(
    (currentPage - 1) * TASK_PAGE_SIZE,
    currentPage * TASK_PAGE_SIZE,
  );
  const imageUrl = projectThumbnailSrc(group.thumbnailUrl, group.coverUrl);

  return (
    <section>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to={`/dashboard/planning/${group.projectId}`}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3"
        >
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
          <h2
            title={group.title}
            className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground group-hover:underline"
          >
            {group.title}
          </h2>
          <Badge variant="outline" className="shrink-0 font-normal">
            {group.typeName}
          </Badge>
        </Link>
        <span className="shrink-0 text-xs text-muted-foreground">组缺 {group.pendingCount}</span>
        {totalPages > 1 && (
          <nav aria-label={`${group.title}任务分页`} className="flex shrink-0 items-center gap-1">
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
              <SelectTrigger aria-label="选择任务页码" title="选择页码，快速跳转" className="w-20">
                <SelectValue aria-live="polite" aria-atomic="true">
                  {currentPage} / {totalPages}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
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
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
        onClick={() => navigate(`/dashboard/planning/${group.projectId}/items/${task.itemId}`)}
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
