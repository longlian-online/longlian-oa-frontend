import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Boxes, Filter, Search, Workflow } from "lucide-react";

import { getWorkshopList } from "@/api/workshop";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import { WorkshopProjectCard } from "@/components/Workshop";
import { $tip } from "@/components/tip";
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
import { isOrganizationAdmin } from "@/lib/session";
import type { WorkshopProjectInfoVO } from "@/types/workshop";

const PAGE_SIZE = 8;

export default function WorkshopPage() {
  const navigate = useNavigate();
  const isOrgAdmin = isOrganizationAdmin();
  const { projectTypes } = useProjectTypes();
  const [projects, setProjects] = useState<WorkshopProjectInfoVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isMyCreated, setIsMyCreated] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void loadWorkshopProjects();
  }, [page, keyword, selectedType, isMyCreated]);

  async function loadWorkshopProjects(): Promise<void> {
    try {
      setLoading(true);
      const data = await getWorkshopList({
        pageNum: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        projectType: selectedType === "all" ? undefined : selectedType,
        isMyCreated,
      });
      setProjects(data.list);
      setTotal(data.total);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "工坊企划加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function handleOpenProject(project: WorkshopProjectInfoVO): void {
    void navigate(`/dashboard/planning/${project.id}`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">工坊</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            浏览已加入工坊的企划，并进入工作流模板管理。
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isOrgAdmin && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void navigate("/dashboard/workshop/tasks")}
              >
                <Boxes data-icon="inline-start" />
                原子任务
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void navigate("/dashboard/workshop/workflows")}
              >
                <Workflow data-icon="inline-start" />
                工作流
              </Button>
            </>
          )}

          <Button
            type="button"
            variant={isMyCreated ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setIsMyCreated(!isMyCreated);
              setPage(1);
            }}
          >
            我创建的
          </Button>

          <Select
            value={selectedType}
            onValueChange={(value: string | null) => {
              if (!value) return;
              setSelectedType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-32">
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

          <div className="relative w-64 max-w-full">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="搜索企划"
              className="h-8 rounded-lg bg-secondary pl-9 text-sm"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleSearch}>
            搜索
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoading message="正在加载工坊企划..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Workflow className="h-5 w-5 text-muted-foreground" />}
          title="暂无工坊企划"
          description="在企划详情中添加到工坊后，这里会展示可浏览的企划。"
          action={<Button onClick={() => void navigate("/dashboard/planning")}>去企划列表</Button>}
        />
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {projects.map((project) => (
              <WorkshopProjectCard key={project.id} project={project} onClick={handleOpenProject} />
            ))}
          </div>

          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
