import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Workflow } from "lucide-react";

import { getWorkshopList } from "@/api/workshop";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import PaginationBar from "@/components/PaginationBar";
import { WorkshopProjectCard } from "@/components/Workshop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import type { WorkshopProjectInfoVO } from "@/types/workshop";

const PAGE_SIZE = 8;

export default function WorkshopPage() {
  const navigate = useNavigate();
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
      <h1 className="text-xl font-bold text-foreground">工坊</h1>
      <div className="flex min-w-0 items-center gap-2">
        <div
          role="group"
          aria-label="企划类型筛选"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1"
        >
          <Button
            type="button"
            variant={selectedType === "all" ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            aria-pressed={selectedType === "all"}
            onClick={() => {
              setSelectedType("all");
              setPage(1);
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
                setSelectedType(type.name);
                setPage(1);
              }}
            >
              {type.name}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant={isMyCreated ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 whitespace-nowrap"
          aria-pressed={isMyCreated}
          onClick={() => {
            setIsMyCreated(!isMyCreated);
            setPage(1);
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
