import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectInfoVO } from "@/types/planning";
import { getProjectList } from "@/api/planning";

const PAGE_SIZE = 8;

const typeOptions = [
  { value: "all", label: "所有类型" },
  { value: "漫画", label: "漫画" },
  { value: "小说", label: "小说" },
  { value: "视频", label: "视频" },
  { value: "美术", label: "美术" },
];

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

export default function Planning() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectInfoVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void loadProjects();
  }, [pageNum, selectedType]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function loadProjects(targetPage = pageNum) {
    try {
      setLoading(true);
      const result = await getProjectList({
        pageNum: targetPage,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        projectType: selectedType === "all" ? undefined : selectedType,
      });
      setProjects(result.list);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    if (pageNum === 1) {
      void loadProjects(1);
      return;
    }
    setPageNum(1);
  }

  function handlePageChange(nextPage: number) {
    setPageNum(Math.min(Math.max(nextPage, 1), totalPages));
  }

  return (
    <div className="space-y-6">
      {/* 顶部搜索和筛选 */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索企划..."
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === "Enter" && handleSearch()
            }
            className="pl-10 h-9 bg-background border-input rounded-md"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* 时间排序 */}
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            时间
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* 类型筛选 */}
          <Select
            value={selectedType}
            onValueChange={(value: string | null) => {
              if (value) {
                setSelectedType(value);
                setPageNum(1);
              }
            }}
          >
            <SelectTrigger className="h-9 w-28 border-0 bg-transparent text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 企划网格 */}
      {loading ? (
        <div className="text-muted-foreground py-8 text-center">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* 创建新企划卡片 */}
          <div
            onClick={() => navigate("/dashboard/planning/create")}
            className="border-input group flex aspect-[5/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card p-8 transition-colors hover:border-primary hover:bg-primary/[0.02]"
          >
            <div className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
              <Plus className="text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm font-medium transition-colors group-hover:text-foreground">
                创建新企划
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">点击开始一个新的创作企划</p>
            </div>
          </div>

          {/* 企划卡片 */}
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/dashboard/planning/${project.id}`)}
              className="group flex aspect-[5/3] cursor-pointer overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
            >
              <div className="h-full w-[40%] shrink-0 overflow-hidden bg-muted">
                {project.coverUrl ? (
                  <img
                    src={project.coverUrl}
                    alt={project.title}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                    {project.title.slice(0, 2)}
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-4 pl-8 pr-4">
                <div className="flex h-[46px] items-center">
                  <h3 className="line-clamp-2 text-base font-normal leading-6 text-foreground">
                    {project.title}
                  </h3>
                </div>

                <div className="h-6 text-right text-base leading-6 text-foreground">
                  {project.projectType}
                </div>

                <div className="flex h-0.5 justify-end gap-2.5">
                  <span className="h-0.5 w-1 bg-muted-foreground" />
                  <span className="h-0.5 w-2 bg-muted-foreground" />
                  <span className="h-0.5 w-8 bg-foreground" />
                </div>

                {project.description && (
                  <p className="line-clamp-3 h-[55px] text-xs leading-[18px] text-muted-foreground">
                    {project.description}
                  </p>
                )}

                <div className="mt-auto flex h-9 items-center gap-2.5">
                  <Avatar className="size-9">
                    <AvatarImage src={project.creatorAvatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {project.title.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    className="h-[34px] rounded-xl bg-foreground px-2 text-xs text-background"
                  >
                    探索企划
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <nav aria-label="企划分页" className="flex h-[38px] items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pageNum <= 1 || loading}
            onClick={() => handlePageChange(pageNum - 1)}
            className="h-8 w-24 gap-2 rounded-lg px-3 py-2 text-base font-normal text-muted-foreground disabled:opacity-100"
          >
            <ChevronLeft data-icon="inline-start" />
            上一页
          </Button>

          <div className="flex h-[38px] items-center gap-2">
            {getPaginationItems(pageNum, totalPages).map((item, index) =>
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
                  disabled={loading}
                  onClick={() => handlePageChange(item)}
                  className={
                    item === pageNum
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
            disabled={pageNum >= totalPages || loading}
            onClick={() => handlePageChange(pageNum + 1)}
            className="h-8 w-24 gap-2 rounded-lg px-3 py-2 text-base font-normal text-foreground disabled:text-muted-foreground disabled:opacity-100"
          >
            下一页
            <ChevronRight data-icon="inline-end" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
