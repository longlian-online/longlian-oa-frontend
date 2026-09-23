import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Search, Workflow } from "lucide-react";

import {
  changeTaskTemplateStatus,
  getOrganizationTaskTemplate,
  getOrganizationTaskTemplateList,
} from "@/api/organizationAdmin";
import EmptyState from "@/components/EmptyState";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import PaginationBar from "@/components/PaginationBar";
import { CreateWorkflowTemplateCard, WorkflowTemplateCard } from "@/components/WorkflowTemplate";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/useConfirm";
import { showApiError } from "@/lib/apiError";
import { toWorkflowTemplateNodes } from "@/lib/workflowTemplate";
import type { WorkshopTaskTemplateVO } from "@/types/workflowTemplate";
import type {
  OrganizationTaskTemplateVO,
  OrganizationResourceStatus,
} from "@/types/organizationAdmin";

const PAGE_SIZE = 8;

function toWorkflowCardTemplate(template: OrganizationTaskTemplateVO): WorkshopTaskTemplateVO {
  return {
    id: template.id,
    name: template.name ?? "未命名工作流",
    description: template.description,
    scope: "ORGANIZATION",
    taskCount: 0,
    nodes: [],
    isMine: true,
  };
}

function OrganizationAdminWorkflowsContent() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<WorkshopTaskTemplateVO[]>([]);
  const [templateStatuses, setTemplateStatuses] = useState<
    Record<string, OrganizationResourceStatus>
  >({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [mutatingTemplateId, setMutatingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    void loadTemplates();
  }, [keyword, page]);

  async function loadTemplates(): Promise<void> {
    try {
      setLoading(true);
      const data = await getOrganizationTaskTemplateList({
        keyword,
        pageNum: page,
        pageSize: PAGE_SIZE,
      });
      const cardTemplates = await Promise.all(
        data.list.map(async (template) => {
          const cardTemplate = toWorkflowCardTemplate(template);
          try {
            const detail = await getOrganizationTaskTemplate(template.id);
            const nodes = toWorkflowTemplateNodes(detail.nodes);
            return { ...cardTemplate, nodes, taskCount: nodes.length };
          } catch {
            return cardTemplate;
          }
        }),
      );
      setTemplates(cardTemplates);
      setTemplateStatuses(
        Object.fromEntries(data.list.map((template) => [template.id, template.status])),
      );
      setTotal(data.total);
    } catch (error) {
      showApiError(error, "工作流模板加载失败");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setKeyword(searchText.trim());
    setPage(1);
  }

  function handleEdit(template: WorkshopTaskTemplateVO): void {
    void navigate(`/dashboard/org-admin/create?templateId=${encodeURIComponent(template.id)}`);
  }

  async function handleStatusChange(template: WorkshopTaskTemplateVO): Promise<void> {
    const isDisabled = templateStatuses[template.id] === "DISABLED";
    const nextStatus: OrganizationResourceStatus = isDisabled ? "ENABLED" : "DISABLED";
    const confirmed = await confirm({
      title: isDisabled ? "启用工作流？" : "禁用工作流？",
      description: isDisabled
        ? `启用后「${template.name}」可以继续用于创建新项目。`
        : `禁用后「${template.name}」不能再用于创建新项目，已有任务流不受影响。`,
      confirmText: isDisabled ? "启用" : "禁用",
      variant: isDisabled ? "default" : "destructive",
    });
    if (!confirmed) return;

    try {
      setMutatingTemplateId(template.id);
      await changeTaskTemplateStatus(template.id, nextStatus);
      $tip(isDisabled ? "工作流已启用" : "工作流已禁用", "success");
      await loadTemplates();
    } catch (error) {
      showApiError(error, "工作流状态更新失败");
    } finally {
      setMutatingTemplateId(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">工作流</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理组织流程模板，创建项目时可直接绑定。
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
          <Button type="button" size="sm" onClick={() => navigate("/dashboard/org-admin/create")}>
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
          action={<Button onClick={() => navigate("/dashboard/org-admin/create")}>创建流程</Button>}
        />
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <CreateWorkflowTemplateCard onClick={() => navigate("/dashboard/org-admin/create")} />
            {templates.map((template) => (
              <WorkflowTemplateCard
                key={template.id}
                template={template}
                status={templateStatuses[template.id]}
                onEdit={handleEdit}
                onStatusChange={(currentTemplate) => void handleStatusChange(currentTemplate)}
                disabling={mutatingTemplateId === template.id}
              />
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

export default function OrganizationAdminWorkflowsPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationAdminWorkflowsContent />
    </OrganizationAdminGuard>
  );
}
