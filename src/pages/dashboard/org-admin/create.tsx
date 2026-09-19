import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";

import {
  createOrganizationTaskTemplate,
  getOrganizationBaseTaskList,
  getOrganizationTaskTemplate,
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
import type { BaseTaskVO } from "@/types/workflowTemplate";
import type {
  OrganizationBaseTaskVO,
  OrganizationTaskTemplateCreateDTO,
} from "@/types/organizationAdmin";
import { toWorkflowTemplateNodes } from "@/lib/workflowTemplate";

interface WorkflowForm {
  name: string;
  description: string;
}

function toEditorBaseTask(task: OrganizationBaseTaskVO): BaseTaskVO {
  return {
    id: task.id,
    name: task.name ?? "未命名任务",
    description: task.description,
    iconName: task.iconName,
    iconUrl: task.iconUrl,
    metaSchema: task.metaSchema,
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
  const [baseTasks, setBaseTasks] = useState<BaseTaskVO[]>([]);
  const [nodes, setNodes] = useState<WorkflowEditorNode[]>([]);
  const [loadingBaseTasks, setLoadingBaseTasks] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const canSave = Boolean(formData.name.trim() && nodes.length > 0 && !saving && !loadingTemplate);

  useEffect(() => {
    void loadBaseTasks();
  }, []);

  async function loadBaseTasks(): Promise<void> {
    try {
      setLoadingBaseTasks(true);
      const data = await getOrganizationBaseTaskList({
        pageNum: 1,
        pageSize: 100,
        status: "ENABLED",
        sortBy: "REF_COUNT",
        orderDir: "DESC",
      });
      setBaseTasks(data.list.map(toEditorBaseTask));
    } catch (error) {
      $tip(error instanceof Error ? error.message : "原子任务加载失败", "error");
    } finally {
      setLoadingBaseTasks(false);
    }
  }

  useEffect(() => {
    if (!templateId) {
      setLoadingTemplate(false);
      return;
    }

    const currentTemplateId = templateId;

    async function loadTemplate(): Promise<void> {
      try {
        setLoadingTemplate(true);
        const detail = await getOrganizationTaskTemplate(currentTemplateId);
        setFormData({
          name: detail.name ?? "未命名工作流",
          description: detail.description ?? "",
        });
        setNodes(buildEditorNodes(toWorkflowTemplateNodes(detail.nodes)));
      } catch (error) {
        $tip(error instanceof Error ? error.message : "工作流详情加载失败", "error");
      } finally {
        setLoadingTemplate(false);
      }
    }

    void loadTemplate();
  }, [templateId]);

  async function handleSave(): Promise<void> {
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

    try {
      setSaving(true);
      if (templateId) {
        await updateOrganizationTaskTemplate(templateId, payload);
        $tip("流程模板已更新", "success");
      } else {
        await createOrganizationTaskTemplate(payload);
        $tip("流程模板已创建", "success");
      }
      void navigate("/dashboard/org-admin/workflows");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "流程模板保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-m-6 flex min-h-[calc(100svh-3.5rem)] flex-col bg-background">
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
