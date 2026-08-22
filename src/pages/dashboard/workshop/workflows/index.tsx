import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Search, Workflow } from "lucide-react";

import { getWorkshopTaskTemplateList } from "@/api/workflowTemplate";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { CreateWorkflowTemplateCard, WorkflowTemplateCard } from "@/components/WorkflowTemplate";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkshopTaskTemplateVO } from "@/types/workflowTemplate";

const PAGE_SIZE = 8;

export default function WorkshopWorkflowsPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkshopTaskTemplateVO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadTemplates();
  }, [keyword, page]);

  async function loadTemplates(): Promise<void> {
    try {
      setLoading(true);
      const data = await getWorkshopTaskTemplateList({
        keyword,
        pageNum: page,
        pageSize: PAGE_SIZE,
      });
      setTemplates(data.list);
      setTotal(data.total);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "工作流模板加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function handleEdit(template: WorkshopTaskTemplateVO): void {
    void navigate("/dashboard/workshop/create", {
      state: { template },
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">工作流</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理个人流程模板，创建项目时可直接绑定。
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="搜索流程"
              className="h-8 rounded-lg bg-secondary pl-9 text-sm"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleSearch}>
            搜索
          </Button>
          <Button type="button" size="sm" onClick={() => navigate("/dashboard/workshop/create")}>
            创建流程
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在加载工作流...
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Workflow className="h-5 w-5 text-muted-foreground" />}
          title="暂无工作流模板"
          description="创建一个流程模板后，就可以在企划项目里复用它。"
          action={<Button onClick={() => navigate("/dashboard/workshop/create")}>创建流程</Button>}
        />
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <CreateWorkflowTemplateCard onClick={() => navigate("/dashboard/workshop/create")} />
            {templates.map((template) => (
              <WorkflowTemplateCard key={template.id} template={template} onEdit={handleEdit} />
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
