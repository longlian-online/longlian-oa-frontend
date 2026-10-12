import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpDown, Filter, Sparkles } from "lucide-react";

import { claimTask } from "@/api/workflowInstance";
import { getTaskPlaza } from "@/api/plaza";
import EmptyState from "@/components/EmptyState";
import FilterToolbar from "@/components/FilterToolbar";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import type { PlazaProjectGroup, PlazaSortBy, PlazaTask } from "@/types/plaza";

const PAGE_SIZE = 8;
const DEFAULT_SORT: PlazaSortBy = "WAIT";

const sortOptions = [
  { value: "WAIT", label: "等待最久" },
  { value: "LATEST", label: "最新发布" },
  { value: "MOST", label: "缺员最多" },
] as const;

const DAY_MS = 86_400_000;

export default function TaskPlaza() {
  const navigate = useNavigate();
  const { projectTypes } = useProjectTypes();
  const [groups, setGroups] = useState<PlazaProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState<PlazaSortBy>(DEFAULT_SORT);
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);
  const [claiming, setClaiming] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadPlaza();
  }, [pageNum, selectedType, sortBy]);

  async function loadPlaza(targetPage = pageNum): Promise<void> {
    try {
      setLoading(true);
      const result = await getTaskPlaza({
        pageNum: targetPage,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        projectType: selectedType === "all" ? undefined : selectedType,
        sortBy,
      });
      setGroups(result.list);
      setTotal(result.total);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "加载任务大厅失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    if (pageNum === 1) {
      void loadPlaza(1);
      return;
    }
    setPageNum(1);
  }

  async function handleClaim(instanceId: string): Promise<void> {
    if (claiming.has(instanceId)) return;
    setClaiming((prev) => new Set(prev).add(instanceId));
    try {
      await claimTask(instanceId);
      $tip("接取成功，可在任务详情中提交", "success");
      setGroups((prev) =>
        prev
          .map((group) => {
            const tasks = group.tasks.filter((task) => task.instanceId !== instanceId);
            return { ...group, tasks, pendingCount: Math.max(0, group.pendingCount - 1) };
          })
          .filter((group) => group.tasks.length > 0),
      );
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (error) {
      $tip(error instanceof Error ? error.message : "接取失败，请稍后再试", "error");
      void loadPlaza(pageNum);
    } finally {
      setClaiming((prev) => {
        const next = new Set(prev);
        next.delete(instanceId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">任务大厅</h1>
        {!loading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? `共 ${total} 个企划正在缺人` : "暂无企划缺人"}
          </p>
        )}
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

      {loading ? (
        <PageLoading message="正在加载任务大厅..." />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5 text-muted-foreground" />}
          title="当前没有缺人的任务"
          description="所有进行中的企划都满员运转中"
          action={<Button onClick={() => navigate("/dashboard/planning")}>去广场看看企划</Button>}
        />
      ) : (
        <>
          <div className="space-y-6">
            {groups.map((group) => (
              <ProjectGroupSection
                key={group.projectId}
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
  onClaim: (instanceId: string) => void;
}

function ProjectGroupSection({ group, claiming, onClaim }: ProjectGroupSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <Link
          to={`/dashboard/planning/${group.projectId}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {group.coverUrl ? (
            <img
              src={group.coverUrl}
              alt={group.title}
              className="size-10 shrink-0 rounded-md border object-cover"
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
        <span className="shrink-0 text-xs text-muted-foreground">
          缺 {group.pendingCount} 人 · {group.itemCount} 个条目
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.tasks.map((task) => (
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
  onClaim: (instanceId: string) => void;
}

function PlazaTaskCard({ group, task, claiming, onClaim }: PlazaTaskCardProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border bg-card p-3 transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {task.nodeName}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          第 {task.stageIndex}/{task.stageTotal} 步
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/planning/${group.projectId}/items/${task.itemId}`)}
          className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
          title={task.itemTitle}
        >
          {task.itemTitle}
        </button>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className="flex items-center gap-0.5"
            aria-label={`已占用 ${task.filledSlots} 槽，缺 ${task.pendingSlots} 人`}
          >
            {Array.from({ length: task.filledSlots }, (_, index) => (
              <span key={`filled-${index}`} className="size-1.5 rounded-full bg-foreground/70" />
            ))}
            {Array.from({ length: task.pendingSlots }, (_, index) => (
              <span
                key={`pending-${index}`}
                className="size-1.5 rounded-full border border-muted-foreground/50"
              />
            ))}
          </span>
          <span className="text-xs text-muted-foreground">缺{task.pendingSlots}</span>
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{waitLabel(task.createdAt)}</span>
        <Button size="sm" disabled={claiming} onClick={() => onClaim(task.instanceId)}>
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
