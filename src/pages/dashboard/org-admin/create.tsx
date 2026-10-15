import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";

import { useApiQuery, useApiMutation, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import {
  createOrganizationTaskTemplate,
  updateOrganizationTaskTemplate,
} from "@/api/organizationAdmin";
import WorkflowEditor, {
  buildEditorNodes,
  toCreateNodes,
  validateEditorNodes,
  type WorkflowEditorNode,
} from "@/components/WorkflowEditor";
import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toWorkflowTemplateNodes } from "@/lib/workflowTemplate";
import {
  organizationTemplateBaseTasksQuery,
  organizationTemplateQuery,
} from "@/queries/organizationAdmin";

import type { BaseTaskVO } from "@/types/workflowTemplate";
import type {
  OrganizationBaseTaskVO,
  OrganizationTaskTemplateCreateDTO,
} from "@/types/organizationAdmin";

interface WorkflowForm {
  name: string;
  description: string;
}

function toEditorBaseTask(task: OrganizationBaseTaskVO): BaseTaskVO {
  return {
    id: task.id,
    name: task.name ?? "未命名任务",
    description: task.description,
    icon: task.icon,
    submitFields: task.submitFields,
    refCount: task.refCount,
    status: task.status,
    createdAt: task.createdAt ?? "",
  };
}

function OrganizationAdminCreateWorkflowContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId");
  const isEditing = Boolean(templateId);
  const [formData, setFormData] = useState<WorkflowForm>({ name: "", description: "" });
  const session = useSessionSnapshot();
  const baseQuery = useApiQuery(organizationTemplateBaseTasksQuery());
  const baseTasks = (baseQuery.data?.list ?? []).map(toEditorBaseTask);
  const templateQuery = useApiQuery(organizationTemplateQuery(templateId));
  const saveMutation = useApiMutation({
    mutationFn: (payload: OrganizationTaskTemplateCreateDTO) =>
      templateId
        ? updateOrganizationTaskTemplate(templateId, payload)
        : createOrganizationTaskTemplate(payload),
    invalidate: [["templates"], ["templateOptions"]],
  });
  const initialized = useRef("");
  const [nodes, setNodes] = useState<WorkflowEditorNode[]>([]);
  const loadingBaseTasks = baseQuery.isLoading;
  const loadingTemplate = templateQuery.isLoading;
  const saving = saveMutation.isPending;

  const canSave = Boolean(
    formData.name.trim() &&
    nodes.length > 0 &&
    !saving &&
    !loadingTemplate &&
    Boolean(baseQuery.data) &&
    (!isEditing || Boolean(templateQuery.data)),
  );

  useEffect((): void => {
    const identity = `${session.appScope}:${session.orgId}:${templateId ?? "new"}`;
    if (initialized.current === identity) return;
    if (templateId && !templateQuery.data) return;
    initialized.current = identity;
    const detail = templateQuery.data;
    setFormData({ name: detail?.name ?? "", description: detail?.description ?? "" });
    setNodes(detail ? buildEditorNodes(toWorkflowTemplateNodes(detail.nodes)) : []);
  }, [templateQuery.data, templateId, session.appScope, session.orgId]);

  async function handleSave(): Promise<void> {
    try {
      if (!formData.name.trim()) {
        $tip("请输入流程名", "error");
        return;
      }

      if (nodes.length === 0) {
        $tip("请至少添加一个任务节点", "error");
        return;
      }

      const validation = validateEditorNodes(nodes, baseTasks);
      if (!validation.valid) {
        $tip(validation.errors[0] || "工作流配置不完整", "error");
        return;
      }

      const payload: OrganizationTaskTemplateCreateDTO = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        nodes: toCreateNodes(nodes).map(({ baseTaskId, sort, parallelSort }) => ({
          baseTaskId,
          sort,
          parallelSort,
        })),
      };

      if (templateId) {
        await saveMutation.mutateAsync(payload);
        $tip("流程模板已更新", "success");
      } else {
        await saveMutation.mutateAsync(payload);
        $tip("流程模板已创建", "success");
      }
      void navigate("/dashboard/org-admin/workflows");
    } catch {
      /* QueryClient 统一显示最终错误，草稿保留。 */
    }
  }

  if (templateQuery.isError && !templateQuery.data)
    return <Button onClick={() => void templateQuery.refetch()}>模板加载失败，重试</Button>;
  return (
    <div className="-m-6 flex min-h-[calc(100svh-3.5rem)] flex-col bg-background">
      {baseQuery.isError && !baseQuery.data && (
        <Button onClick={() => void baseQuery.refetch()}>任务库加载失败，重试</Button>
      )}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <h1 className="text-lg font-bold leading-6 text-foreground">
          {isEditing ? "编辑工作流程" : "创建工作流程"}
        </h1>
        <div className="flex-1" />
        <Button type="button" disabled={!canSave} className="h-9 px-4" onClick={handleSave}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditing ? "更新" : "创建"}
        </Button>
      </div>

      <div className="grid gap-3 border-b bg-card px-4 py-3 md:grid-cols-[280px_minmax(0,1fr)]">
        <label className="flex flex-col gap-1.5 text-sm text-foreground">
          流程名
          <Input
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="请输入流程名"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-foreground">
          简介
          <Textarea
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            placeholder="描述流程适用场景"
            className="min-h-10 resize-none"
          />
        </label>
      </div>

      <div className="flex flex-1 items-start gap-4 overflow-hidden p-4">
        <WorkflowEditor
          value={nodes}
          baseTasks={baseTasks}
          loadingBaseTasks={loadingBaseTasks}
          onChange={setNodes}
        />
      </div>
    </div>
  );
}

export default function OrganizationAdminCreateWorkflowPage() {
  return (
    <OrganizationAdminGuard>
      <OrganizationAdminCreateWorkflowContent />
    </OrganizationAdminGuard>
  );
}
