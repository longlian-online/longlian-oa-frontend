import { useLocation, useNavigate } from "react-router";
import { Search, Workflow } from "lucide-react";

import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { usePageQuery } from "@/hooks/usePageQuery";
import { useListQueryState, useListSearchDraft } from "@/hooks/useListQueryState";
import { WORKFLOW_PAGE_SIZE as PAGE_SIZE, workflowListQuery } from "@/queries/workshop";
import CenteredLoading from "@/components/CenteredLoading";
import EmptyState from "@/components/EmptyState";
import PaginationBar from "@/components/PaginationBar";
import { CreateWorkflowTemplateCard, WorkflowTemplateCard } from "@/components/WorkflowTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { WorkshopTaskTemplateVO } from "@/types/workflowTemplate";

function WorkshopWorkflowsPageContent() {
  const navigate = useNavigate();
  const [page, setPage] = usePageQuery();
  const location = useLocation();
  const returnState = { ...location.state, listReturnTo: location.pathname + location.search };
  const openCreate = (): void => {
    void navigate("/dashboard/workshop/create", { state: returnState });
  };
  const [{ keyword }, updateQuery] = useListQueryState({ keyword: "" });
  const [searchText, setSearchText] = useListSearchDraft(keyword);

  const listQuery = useApiQuery(workflowListQuery(page, keyword));
  const templates = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading;
  function handleSearch(): void {
    updateQuery({ keyword: searchText.trim() });
  }

  function handleEdit(template: WorkshopTaskTemplateVO): void {
    void navigate("/dashboard/workshop/create", {
      state: { ...returnState, template },
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      {listQuery.isFetching && listQuery.data && (
        <p role="status" className="text-sm text-muted-foreground">
          正在刷新...
        </p>
      )}

      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">工作流</h1>
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
          <Button type="button" size="sm" onClick={openCreate}>
            创建流程
          </Button>
        </div>
      </div>

      {listQuery.isError && !listQuery.data ? (
        <div role="alert">
          {listQuery.error.message}
          <Button onClick={() => void listQuery.refetch()}>重试</Button>
        </div>
      ) : loading ? (
        <CenteredLoading message="正在加载工作流..." />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Workflow className="h-5 w-5 text-muted-foreground" />}
          title="暂无工作流模板"
          description="创建一个流程模板后，就可以在企划项目里复用它。"
          action={<Button onClick={openCreate}>创建流程</Button>}
        />
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <CreateWorkflowTemplateCard onClick={openCreate} />
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

export default function WorkshopWorkflowsPage() {
  return <WorkshopWorkflowsPageContent />;
}
