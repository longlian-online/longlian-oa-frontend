import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import {
  abandonTask,
  assignTask,
  claimTask,
  proxySubmitTask,
  rejectTask,
  resetTask,
  saveTaskDraft,
  submitTask,
  submitTaskDraft,
} from "@/api/workflowInstance";
import { completeItem } from "@/api/projectItem";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/useConfirm";
import { getUserId } from "@/lib/session";
import { formatTaskTitle, slotPosition } from "@/lib/slotLabel";
import { itemFlowQuery, itemInstancesQuery } from "@/queries/planning";
import { buildParticipantRoster } from "./participantRoster";
import ItemDeletionRequestButton from "./ItemDeletionRequestButton";
import TaskDetailPanel from "./TaskDetailPanel";
import { canReset, canReject, canOwnerCancel, canAssign, canProxySubmit } from "./taskPermissions";
import AssignTaskDialog from "./AssignTaskDialog";
import OwnerTaskActionDialog from "./OwnerTaskActionDialog";
import TaskFlowViewer from "./TaskFlowViewer";
import TaskSubmitPanel from "./TaskSubmitPanel";
import ProxySubmitDialog from "./ProxySubmitDialog";
import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";

import type {
  ItemTaskInstanceVO,
  ItemTaskNodeVO,
  TaskClaimResultVO,
  TaskProxySubmitDTO,
  TaskSubmitDTO,
} from "@/types/workflowInstance";

interface WorkflowInstanceProps {
  itemId: string;
  projectId?: string;
  /** 企划详情的 canManage：创建者，或本组织启用中的组织所有者、组织管理员。 */
  canManage: boolean;
  taskInstanceId?: string;
}

function getSortedInstances(instances: ItemTaskInstanceVO[]): ItemTaskInstanceVO[] {
  return [...instances].sort((prev, next) => {
    if (prev.sort !== next.sort) return prev.sort - next.sort;
    return prev.parallelSort - next.parallelSort;
  });
}

function findNodeByInstance(
  instance: ItemTaskInstanceVO,
  nodes: ItemTaskNodeVO[],
): ItemTaskNodeVO | undefined {
  return nodes.find(
    (node) =>
      node.taskInstanceId === instance.id ||
      (node.sort === instance.sort && node.parallelSort === instance.parallelSort),
  );
}

function isNodeUnlocked(node: ItemTaskNodeVO, nodes: ItemTaskNodeVO[]): boolean {
  return nodes
    .filter((candidate) => candidate.sort < node.sort)
    .every((candidate) => candidate.taskStatus === "COMPLETED");
}

export default function WorkflowInstance(props: WorkflowInstanceProps) {
  return <ItemWorkflowInstance key={props.itemId} {...props} />;
}

function ItemWorkflowInstance({
  itemId,
  projectId,
  canManage,
  taskInstanceId,
}: WorkflowInstanceProps) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserId = getUserId();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrentLifecycle = (): boolean => mounted.current;
  const actionLock = useRef(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const handledEntry = useRef<string | null>(null);
  const [entryError, setEntryError] = useState("");
  const flowQuery = useApiQuery(itemFlowQuery(itemId));
  const instancesQuery = useApiQuery(itemInstancesQuery(itemId));
  const taskFlow = flowQuery.data;
  const instances = instancesQuery.data ?? [];
  const actionMutation = useApiMutation({
    mutationFn: async ({
      action,
    }: {
      instanceId: string;
      action: () => Promise<void | TaskClaimResultVO>;
    }): Promise<void | TaskClaimResultVO> => {
      try {
        return await action();
      } catch (error) {
        if (!mounted.current) throw new DOMException("操作项目已切换", "AbortError");
        throw error;
      }
    },
    invalidate: [
      ["flow"],
      ["instances"],
      ["taskDetail"],
      ["taskVersions"],
      ["myTasks"],
      ["items"],
      ["projects"],
      ["workshop"],
      ["plaza"],
    ],
  });
  const completeMutation = useApiMutation({
    mutationFn: async (): Promise<void> => {
      if (!projectId) throw new Error("项目不存在");
      return completeItem(projectId, itemId);
    },
    invalidate: [["flow"], ["items"]],
  });
  const [submitTarget, setSubmitTarget] = useState<{
    instance: ItemTaskInstanceVO;
    node: ItemTaskNodeVO;
  } | null>(null);
  const [draftTarget, setDraftTarget] = useState<{
    instance: ItemTaskInstanceVO;
    node: ItemTaskNodeVO;
  } | null>(null);
  const [assignTarget, setAssignTarget] = useState<{
    instance: ItemTaskInstanceVO;
    title: string;
  } | null>(null);
  const [proxyTarget, setProxyTarget] = useState<{
    instance: ItemTaskInstanceVO;
    node: ItemTaskNodeVO;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ItemTaskInstanceVO | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [ownerTarget, setOwnerTarget] = useState<{
    instance: ItemTaskInstanceVO;
    title: string;
  } | null>(null);
  const sortedInstances = useMemo(() => getSortedInstances(instances), [instances]);
  const participantRoster = useMemo(
    () => (taskFlow ? buildParticipantRoster(instances) : ""),
    [instances, taskFlow],
  );
  const selectedNode = taskFlow?.nodes.find((node) => node.id === selectedNodeId);
  const selectedInstance = selectedNode
    ? sortedInstances.find((instance) =>
        selectedNode.taskInstanceId
          ? instance.id === selectedNode.taskInstanceId
          : instance.sort === selectedNode.sort &&
            instance.parallelSort === selectedNode.parallelSort,
      )
    : undefined;

  useEffect(() => {
    if (!taskInstanceId || !taskFlow || !instancesQuery.data) return;
    if (handledEntry.current === taskInstanceId) return;
    handledEntry.current = taskInstanceId;
    setSubmitTarget(null);
    setDraftTarget(null);
    const node = taskFlow.nodes.find((candidate) => candidate.taskInstanceId === taskInstanceId);
    const instance = instancesQuery.data.find((candidate) => candidate.id === taskInstanceId);
    if (!node || !instance) {
      setSelectedNodeId(null);
      setEntryError("指定任务不存在或已不可访问，请返回工坊查看最新待办。");
      return;
    }
    setSelectedNodeId(node.id);
    setEntryError("");
  }, [taskInstanceId, taskFlow, instancesQuery.data]);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setEntryError("");
  }, []);

  async function runInstanceAction(
    instanceId: string,
    action: () => Promise<void | TaskClaimResultVO>,
    successMessage: string,
  ): Promise<boolean> {
    if (!isCurrentLifecycle() || actionLock.current) return false;
    actionLock.current = true;
    try {
      const result = await actionMutation.mutateAsync({ instanceId, action });
      if (!isCurrentLifecycle()) return false;
      $tip(
        result && result.autoJoinedProject === true
          ? `${successMessage}，已自动加入该企划`
          : successMessage,
        "success",
      );
      return isCurrentLifecycle();
    } catch {
      return false;
    } finally {
      actionLock.current = false;
    }
  }

  async function completeCurrentItem(): Promise<void> {
    if (!projectId || !isCurrentLifecycle() || taskFlow?.status === "COMPLETED") return;
    try {
      await completeMutation.mutateAsync();
      if (!isCurrentLifecycle()) return;
      $tip("项目已完成", "success");
    } catch {
      // MutationCache reports the failure.
    }
  }

  function openSubmit(instance: ItemTaskInstanceVO, node?: ItemTaskNodeVO): void {
    const targetNode = node ?? findNodeByInstance(instance, taskFlow?.nodes ?? []);
    if (!targetNode) {
      $tip("任务提交表单尚未加载，请重新加载任务流", "error");
      return;
    }
    if (!isNodeUnlocked(targetNode, taskFlow?.nodes ?? [])) {
      $tip("请先完成前置阶段", "error");
      return;
    }
    if (targetNode.submitFields.length === 0) {
      void runInstanceAction(
        instance.id,
        () => submitTask(instance.id, { values: {} }),
        "任务已提交",
      );
      return;
    }
    setSubmitTarget({
      instance,
      node: targetNode,
    });
  }

  function openDraft(instance: ItemTaskInstanceVO, node?: ItemTaskNodeVO): void {
    const targetNode = node ?? findNodeByInstance(instance, taskFlow?.nodes ?? []);
    if (!targetNode || targetNode.submitFields.length === 0) return;
    if (!isNodeUnlocked(targetNode, taskFlow?.nodes ?? [])) {
      $tip("请先完成前置阶段", "error");
      return;
    }
    setDraftTarget({ instance, node: targetNode });
  }

  async function handleSaveDraft(submission: TaskSubmitDTO): Promise<boolean> {
    if (!draftTarget) return false;
    const succeeded = await runInstanceAction(
      draftTarget.instance.id,
      () => saveTaskDraft(draftTarget.instance.id, submission).then(() => undefined),
      "已暂存",
    );
    if (succeeded) setDraftTarget(null);
    return succeeded;
  }

  async function handlePublishDraft(submission: TaskSubmitDTO): Promise<boolean> {
    if (!draftTarget) return false;
    const saved = await runInstanceAction(
      draftTarget.instance.id,
      () => saveTaskDraft(draftTarget.instance.id, submission).then(() => undefined),
      "已暂存",
    );
    if (!saved) return false;
    const succeeded = await runInstanceAction(
      draftTarget.instance.id,
      () => submitTaskDraft(draftTarget.instance.id),
      "任务已提交",
    );
    if (succeeded) setDraftTarget(null);
    return succeeded;
  }

  async function handleSubmit(submission: TaskSubmitDTO): Promise<boolean> {
    if (!submitTarget) return false;

    const succeeded = await runInstanceAction(
      submitTarget.instance.id,
      () => submitTask(submitTarget.instance.id, submission),
      "任务已提交",
    );
    if (succeeded) setSubmitTarget(null);
    return succeeded;
  }

  function openProxySubmit(instance: ItemTaskInstanceVO): void {
    const targetNode = findNodeByInstance(instance, taskFlow?.nodes ?? []);
    if (!targetNode || !canProxySubmit(instance, taskFlow?.nodes ?? [], canManage)) {
      $tip("任务状态已变更或无操作权限，请刷新后重新操作", "error");
      return;
    }
    setProxyTarget({ instance, node: targetNode });
  }

  async function handleProxySubmit(submission: TaskProxySubmitDTO): Promise<boolean> {
    if (!proxyTarget) return false;
    const current = instances.find((candidate) => candidate.id === proxyTarget.instance.id);
    if (
      !current ||
      current.revision !== proxyTarget.instance.revision ||
      !canProxySubmit(current, taskFlow?.nodes ?? [], canManage)
    ) {
      $tip("任务状态已变更或无操作权限，请刷新后重新操作", "error");
      return false;
    }
    const succeeded = await runInstanceAction(
      proxyTarget.instance.id,
      () => proxySubmitTask(proxyTarget.instance.id, submission),
      "已代提交",
    );
    if (succeeded) setProxyTarget(null);
    return succeeded;
  }

  async function handleReject(): Promise<void> {
    const current = instances.find((candidate) => candidate.id === rejectTarget?.id);
    if (
      !rejectTarget ||
      !current ||
      current.revision !== rejectTarget.revision ||
      !rejectComment.trim() ||
      rejectComment.trim().length > 500 ||
      !canReject(current, taskFlow?.nodes ?? [], instances, currentUserId, canManage)
    )
      return;

    const succeeded = await runInstanceAction(
      rejectTarget.id,
      () =>
        rejectTask(rejectTarget.id, {
          expectedRevision: rejectTarget.revision,
          reviewComment: rejectComment.trim(),
        }),
      "任务已打回",
    );
    if (succeeded) {
      setRejectTarget(null);
      setRejectComment("");
    }
  }

  async function handleOwnerCancel(): Promise<boolean> {
    if (!ownerTarget) return false;
    const { instance } = ownerTarget;
    const current = instances.find((candidate) => candidate.id === instance.id);
    if (
      !current ||
      current.revision !== instance.revision ||
      !canOwnerCancel(current, instances, canManage)
    ) {
      $tip("任务状态已变更或无操作权限，请刷新后重新操作", "error");
      return false;
    }
    return runInstanceAction(
      instance.id,
      () => abandonTask(instance.id, { expectedRevision: instance.revision }),
      "已取消接取",
    );
  }

  async function handleAssign(assigneeId: string): Promise<boolean> {
    if (!assignTarget) return false;
    const { instance } = assignTarget;
    const current = instances.find((candidate) => candidate.id === instance.id);
    if (!current || current.revision !== instance.revision || !canAssign(current, canManage)) {
      $tip("任务状态已变更或无操作权限，请刷新后重新操作", "error");
      return false;
    }
    return runInstanceAction(
      instance.id,
      () => assignTask(instance.id, { assigneeId, expectedRevision: instance.revision }),
      "任务已分配",
    );
  }

  async function handleAbandon(instanceId: string): Promise<void> {
    const instance = instances.find((candidate) => candidate.id === instanceId);
    if (!instance) return;
    const confirmed = await confirm({
      title: "放弃任务？",
      description: "放弃后任务会回到待接取状态，其他成员可以重新接取。",
      confirmText: "放弃",
    });
    if (!confirmed) return;
    await runInstanceAction(
      instanceId,
      () => abandonTask(instanceId, { expectedRevision: instance.revision }),
      "已放弃任务",
    );
  }

  async function handleReset(instanceId: string): Promise<void> {
    const instance = instances.find((candidate) => candidate.id === instanceId);
    if (!instance || !canReset(instance, currentUserId)) return;
    const confirmed = await confirm({
      title: "重置提交？",
      description: "重置后任务会回到待提交状态，需要重新提交。",
      confirmText: "重置",
    });
    if (!confirmed) return;
    await runInstanceAction(instanceId, () => resetTask(instanceId), "任务已重置");
  }

  async function handleCopyParticipantRoster(): Promise<void> {
    if (!participantRoster || !taskFlow) return;
    try {
      await navigator.clipboard.writeText(participantRoster);
      $tip(`${taskFlow.itemTitle} · 参与名单已复制`, "success");
    } catch {
      $tip("复制失败，请手动复制", "error");
    }
  }

  const mutatingInstanceId = actionMutation.isPending
    ? (actionMutation.variables?.instanceId ?? null)
    : null;

  if (flowQuery.isLoading || instancesQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">正在加载任务流...</div>;
  }

  if (!taskFlow || (!instancesQuery.data && instancesQuery.isError)) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
        <span>
          {flowQuery.isError || instancesQuery.isError ? "任务流加载失败" : "任务流不存在"}
        </span>
        {(flowQuery.isError || instancesQuery.isError) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void Promise.all([flowQuery.refetch(), instancesQuery.refetch()])}
          >
            重新加载
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex min-h-12 items-center gap-3 px-1">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">项目任务流</p>
          <h1 className="break-words text-lg font-semibold text-foreground">
            {taskFlow.itemTitle}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">流程模板：{taskFlow.name}</p>
          {taskFlow.description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{taskFlow.description}</p>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {projectId && canManage && taskFlow.status !== "COMPLETED" && (
            <Button
              size="sm"
              disabled={completeMutation.isPending}
              onClick={() => void completeCurrentItem()}
            >
              完成
            </Button>
          )}
          {projectId && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void navigate(`/dashboard/planning/${projectId}/items/${itemId}/workflow`, {
                  state: location.state,
                })
              }
            >
              编辑工作流
            </Button>
          )}
          {projectId && canManage && (
            <ItemDeletionRequestButton
              projectId={projectId}
              itemId={itemId}
              itemTitle={taskFlow.itemTitle}
              hasSubmissionRecord={taskFlow.hasSubmissionRecord}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={!participantRoster}
            title={participantRoster ? "复制参与名单" : "暂无参与人"}
            onClick={() => void handleCopyParticipantRoster()}
          >
            <Copy data-icon="inline-start" />
            复制参与名单
          </Button>
        </div>
      </header>

      {entryError && (
        <p role="alert" className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          {entryError}
        </p>
      )}

      <TaskFlowViewer
        selectedNodeId={selectedNodeId}
        initialNodeId={taskFlow.nodes.find((node) => node.taskInstanceId === taskInstanceId)?.id}
        onSelectNode={selectNode}
        nodes={taskFlow.nodes}
        instances={sortedInstances}
        currentUserId={currentUserId}
        mutatingInstanceId={mutatingInstanceId}
        onClaim={(instanceId) =>
          void runInstanceAction(instanceId, () => claimTask(instanceId), "任务已接取")
        }
        onSubmit={(instance, node) => openSubmit(instance, node)}
        onSaveDraft={(instance, node) => openDraft(instance, node)}
      />

      {selectedNode ? (
        <div>
          <TaskDetailPanel
            key={`${itemId}:${selectedNode.id}`}
            title={formatTaskTitle(taskFlow.itemTitle, slotPosition(selectedNode, taskFlow.nodes))}
            node={selectedNode}
            instance={selectedInstance}
            actions={
              selectedInstance && selectedNode.taskStatus !== null
                ? {
                    currentUserId,
                    mutating: mutatingInstanceId === selectedInstance.id,
                    canSubmit: isNodeUnlocked(selectedNode, taskFlow.nodes),
                    canReset: canReset(selectedInstance, currentUserId),
                    canReject: canReject(
                      selectedInstance,
                      taskFlow.nodes,
                      instances,
                      currentUserId,
                      canManage,
                    ),
                    canOwnerCancel: canOwnerCancel(selectedInstance, instances, canManage),
                    canAssign: canAssign(selectedInstance, canManage),
                    canProxySubmit: canProxySubmit(selectedInstance, taskFlow.nodes, canManage),
                    onOwnerCancel: () =>
                      setOwnerTarget({
                        instance: selectedInstance,
                        title: formatTaskTitle(
                          taskFlow.itemTitle,
                          slotPosition(selectedNode, taskFlow.nodes),
                        ),
                      }),
                    onClaim: () =>
                      void runInstanceAction(
                        selectedInstance.id,
                        () => claimTask(selectedInstance.id),
                        "任务已接取",
                      ),
                    onAssign: () =>
                      setAssignTarget({
                        instance: selectedInstance,
                        title: formatTaskTitle(
                          taskFlow.itemTitle,
                          slotPosition(selectedNode, taskFlow.nodes),
                        ),
                      }),
                    onSubmit: () => openSubmit(selectedInstance),
                    onSaveDraft: () => openDraft(selectedInstance),
                    hasExtraFields: selectedNode.submitFields.length > 0,
                    onProxySubmit: () => openProxySubmit(selectedInstance),
                    onAbandon: () => void handleAbandon(selectedInstance.id),
                    onReject: () => setRejectTarget(selectedInstance),
                    onReset: () => void handleReset(selectedInstance.id),
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          点击流程节点查看任务详情和操作。
        </div>
      )}

      {draftTarget && (
        <TaskSubmitPanel
          key={`draft:${draftTarget.instance.id}`}
          open
          taskInstanceId={draftTarget.instance.id}
          taskName={formatTaskTitle(
            taskFlow.itemTitle,
            slotPosition(draftTarget.node, taskFlow.nodes),
          )}
          submitFields={draftTarget.node.submitFields}
          title="暂存任务"
          confirmLabel="暂存"
          skipRequired
          restoreDraft
          onSecondary={handlePublishDraft}
          secondaryLabel="提交这份暂存"
          onOpenChange={(open) => {
            if (!open) setDraftTarget(null);
          }}
          submitting={
            actionMutation.isPending &&
            actionMutation.variables?.instanceId === draftTarget.instance.id
          }
          onSubmit={handleSaveDraft}
        />
      )}

      {submitTarget && (
        <TaskSubmitPanel
          key={submitTarget.instance.id}
          open
          taskInstanceId={submitTarget.instance.id}
          taskName={formatTaskTitle(
            taskFlow.itemTitle,
            slotPosition(submitTarget.node, taskFlow.nodes),
          )}
          submitFields={submitTarget.node.submitFields}
          onOpenChange={(open) => {
            if (!open) {
              setSubmitTarget(null);
            }
          }}
          submitting={
            actionMutation.isPending &&
            actionMutation.variables?.instanceId === submitTarget.instance.id
          }
          onSubmit={handleSubmit}
        />
      )}

      {proxyTarget && (
        <ProxySubmitDialog
          key={`${itemId}:${proxyTarget.instance.id}:${proxyTarget.instance.revision}`}
          taskInstanceId={proxyTarget.instance.id}
          taskName={formatTaskTitle(
            taskFlow.itemTitle,
            slotPosition(proxyTarget.node, taskFlow.nodes),
          )}
          expectedRevision={proxyTarget.instance.revision}
          submitFields={proxyTarget.node.submitFields}
          submitting={
            actionMutation.isPending &&
            actionMutation.variables?.instanceId === proxyTarget.instance.id
          }
          onClose={() => setProxyTarget(null)}
          onSubmit={handleProxySubmit}
        />
      )}

      {ownerTarget && (
        <OwnerTaskActionDialog
          key={`${itemId}:${ownerTarget.instance.id}:${ownerTarget.instance.revision}`}
          instance={ownerTarget.instance}
          taskTitle={ownerTarget.title}
          onClose={() => setOwnerTarget(null)}
          onConfirm={handleOwnerCancel}
        />
      )}

      {assignTarget && (
        <AssignTaskDialog
          key={`${itemId}:${assignTarget.instance.id}:${assignTarget.instance.revision}`}
          taskTitle={assignTarget.title}
          onClose={() => setAssignTarget(null)}
          onConfirm={handleAssign}
        />
      )}

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>打回任务{rejectTarget ? `：${rejectTarget.name}` : ""}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectComment}
            placeholder="请输入打回意见"
            className="min-h-28 resize-none"
            onChange={(event) => setRejectComment(event.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={
                !rejectComment.trim() ||
                rejectComment.trim().length > 500 ||
                actionMutation.isPending
              }
              onClick={() => void handleReject()}
            >
              打回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
