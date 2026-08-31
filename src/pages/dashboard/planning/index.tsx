import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Clock, Filter, FolderOpen, Plus } from "lucide-react";

import { getProjectList } from "@/api/planning";
import EmptyState from "@/components/EmptyState";
import FilterToolbar from "@/components/FilterToolbar";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import { $tip } from "@/components/tip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { parseProjectMetadataTags } from "@/lib/projectMetadata";
import type { ProjectInfoVO } from "@/types/planning";

const PAGE_SIZE = 8;

export default function Planning() {
  const navigate = useNavigate();
  const { projectTypes } = useProjectTypes();
  const [projects, setProjects] = useState<ProjectInfoVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void loadProjects();
  }, [pageNum, selectedType]);

  async function loadProjects(targetPage = pageNum): Promise<void> {
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
      $tip(error instanceof Error ? error.message : "企划加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    if (pageNum === 1) {
      void loadProjects(1);
      return;
    }
    setPageNum(1);
  }

  return (
    <div className="space-y-6">
      <FilterToolbar
        searchValue={keyword}
        searchPlaceholder="搜索企划..."
        onSearchChange={setKeyword}
        onSearchSubmit={handleSearch}
        actions={
          <>
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              时间
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Select
              value={selectedType}
              onValueChange={(value: string | null) => {
                if (value) {
                  setSelectedType(value);
                  setPageNum(1);
                }
              }}
            >
              <SelectTrigger className="h-9 w-28 border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
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
        <PageLoading message="正在加载企划..." />
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <CreateProjectCard onClick={() => navigate("/dashboard/planning/create")} />
              <div className="md:col-span-1 lg:col-span-2 xl:col-span-3">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <CreateProjectCard onClick={() => navigate("/dashboard/planning/create")} />
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/dashboard/planning/${project.id}`)}
                />
              ))}
            </div>
          )}

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

interface CreateProjectCardProps {
  onClick: () => void;
}

function CreateProjectCard({ onClick }: CreateProjectCardProps) {
  return (
    <div
      onClick={onClick}
      className="border-input group flex aspect-[5/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-4 transition-colors hover:border-primary hover:bg-primary/[0.02]"
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
  );
}

interface ProjectCardProps {
  project: ProjectInfoVO;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const metadataTags = parseProjectMetadataTags(project.metadata).slice(0, 2);

  return (
    <article
      onClick={onClick}
      className="group flex aspect-[5/3] cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-md"
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

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">
            {project.title}
          </h3>
          <Badge variant="outline" className="shrink-0 font-normal">
            {project.projectType}
          </Badge>
        </div>

        <p className="mt-2 line-clamp-2 min-h-9 text-xs leading-[18px] text-muted-foreground">
          {project.description || "暂无简介"}
        </p>

        <div className="mt-3 flex min-h-5 flex-wrap gap-1.5 overflow-hidden">
          {metadataTags.map((tag, index) => (
            <span
              key={`${tag.key}-${tag.value}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] leading-4"
            >
              <span className="shrink-0 text-muted-foreground">{tag.key}</span>
              <span className="truncate text-foreground">{tag.value}</span>
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-3">
          <Avatar className="size-9">
            <AvatarImage src={project.creatorAvatarUrl} />
            <AvatarFallback className="text-[10px]">{project.title.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="ml-auto text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            查看企划
          </span>
        </div>
      </div>
    </article>
  );
}
