import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router";

import { listMemberOptions } from "@/api/member";
import { createProjectItem } from "@/api/projectItem";
import WorkflowEditor, { type WorkflowEditorNode } from "@/components/WorkflowEditor";
import MemberOptionField from "@/components/WorkflowInstance/MemberOptionField";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { useConfirm } from "@/hooks/useConfirm";
import {
  buildCreateItemNodes,
  createItemDraftSignature,
  toCreateItemNodes,
  validateCreateItemNodes,
} from "@/lib/createItemWorkflow";
import { projectDetailQuery, taskTemplateOptionsQuery } from "@/queries/planning";
import { baseTaskOptionsQuery } from "@/queries/workshop";

import type { ProjectItemCreateDTO } from "@/types/projectItem";

export default function CreateProjectItemPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) {
    return <div className="py-8 text-center text-sm text-muted-foreground">企划不存在</div>;
  }
  return <CreateProjectItem projectId={projectId} />;
}

function CreateProjectItem({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const projectQuery = useApiQuery(projectDetailQuery(projectId));
  const templatesQuery = useApiQuery(taskTemplateOptionsQuery());
  const baseTasksQuery = useApiQuery(baseTaskOptionsQuery());
  const membersQuery = useApiQuery({
    key: ["memberOptions"],
    queryFn: listMemberOptions,
    staleTime: 0,
  });
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [nodes, setNodes] = useState<WorkflowEditorNode[]>([]);
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = useState(() => createItemDraftSignature([], {}));
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const saveLock = useRef(false);
  const createMutation = useApiMutation({
    mutationFn: (dto: ProjectItemCreateDTO) => createProjectItem(projectId, dto),
    invalidate: [["items"], ["projects"], ["workshop"], ["plaza"]],
  });
  const saving = createMutation.isPending || saveSucceeded;
  const templates = templatesQuery.data ?? [];
  const baseTasks = baseTasksQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const canCreate = Boolean(title.trim() && templateId && nodes.length > 0 && !saving);

  function assigneeNames(): Record<string, string | undefined> {
    return Object.fromEntries(
      Object.entries(assignees).map(([localId, userId]) => [
        localId,
        members.find((member) => member.userId === userId)?.nickname || "已指定",
      ]),
    );
  }

  function applyTemplate(nextTemplateId: string): void {
    const template = templates.find((item) => item.id === nextTemplateId);
    const nextNodes = buildCreateItemNodes(template?.nodes ?? [], baseTasks);
    setTemplateId(nextTemplateId);
    setNodes(nextNodes);
    setAssignees({});
    setSnapshot(createItemDraftSignature(nextNodes, {}));
  }

  async function changeTemplate(nextTemplateId: string): Promise<void> {
    if (nextTemplateId === templateId) return;
    if (createItemDraftSignature(nodes, assignees) !== snapshot) {
      const confirmed = await confirm({
        title: "更换流程模板？",
        description: "当前步骤和已指定的执行人会被替换。",
        confirmText: "更换",
      });
      if (!confirmed) return;
    }
    applyTemplate(nextTemplateId);
  }

  function back(): void {
    void navigate(`/dashboard/planning/${projectId}`, { state: location.state });
  }

  async function cancel(): Promise<void> {
    const dirty = Boolean(
      title.trim() || templateId || createItemDraftSignature(nodes, assignees) !== snapshot,
    );
    if (dirty) {
      const confirmed = await confirm({
        title: "离开创建？",
        description: "已填写的内容不会保存，项目也不会被创建。",
        confirmText: "离开",
      });
      if (!confirmed) return;
    }
    back();
  }

  async function handleCreate(): Promise<void> {
    if (saveLock.current || !canCreate) return;
    const validation = validateCreateItemNodes(nodes, baseTasks);
    if (!validation.valid) {
      $tip(validation.errors[0] || "工作流配置不完整", "error");
      return;
    }
    saveLock.current = true;
    let succeeded = false;
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        taskTemplateId: templateId,
        nodes: toCreateItemNodes(nodes, assignees),
      });
      succeeded = true;
      setSaveSucceeded(true);
      $tip("项目已创建", "success");
      back();
    } catch {
      /* 失败保留草稿。 */
    } finally {
      if (!succeeded) saveLock.current = false;
    }
  }

  if (projectQuery.isLoading || templatesQuery.isLoading || baseTasksQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">正在加载...</div>;
  }

  if (projectQuery.data && projectQuery.data.isCreator !== true) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <p>仅企划负责人可创建项目</p>
        <Button variant="outline" className="mt-4" onClick={back}>
          返回企划
        </Button>
      </div>
    );
  }

  return (
    <div className="-mx-6 -mb-6 flex h-[calc(100svh-6.25rem)] flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <h1 className="text-lg font-bold leading-6 text-foreground">创建项目</h1>
        <div className="flex-1" />
        <Button type="button" variant="ghost" disabled={saving} onClick={() => void cancel()}>
          取消
        </Button>
        <Button
          type="button"
          disabled={!canCreate}
          className="h-9 px-4"
          onClick={() => void handleCreate()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          创建
        </Button>
      </div>
      <div className="grid gap-3 border-b bg-card px-4 py-3 md:grid-cols-[minmax(0,1fr)_240px]">
        <label className="flex flex-col gap-1.5 text-sm text-foreground">
          项目名
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-foreground">
          流程模板
          <Select
            value={templateId}
            onValueChange={(value: string | null) => void changeTemplate(value || "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择流程模板" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      {templateId ? (
        <div className="flex min-h-0 flex-1 items-start gap-4 overflow-hidden p-4">
          <WorkflowEditor
            value={nodes}
            baseTasks={baseTasks}
            loadingBaseTasks={baseTasksQuery.isLoading}
            assigneeNames={assigneeNames()}
            renderAssignee={(node) => (
              <div className="flex flex-col gap-2">
                <MemberOptionField
                  key={node.localId}
                  id={`assignee-${node.localId}`}
                  listId={`assignee-list-${node.localId}`}
                  label="执行人"
                  value={assignees[node.localId] ?? ""}
                  onChange={(userId) =>
                    setAssignees((current) => ({ ...current, [node.localId]: userId }))
                  }
                />
                {assignees[node.localId] ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      setAssignees((current) => {
                        const next = { ...current };
                        delete next[node.localId];
                        return next;
                      })
                    }
                  >
                    取消指定
                  </Button>
                ) : null}
              </div>
            )}
            onChange={setNodes}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          先选择流程模板
        </div>
      )}
    </div>
  );
}
