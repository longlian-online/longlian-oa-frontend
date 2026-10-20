import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Copy } from "lucide-react";

import { abandonTask, claimTask, rejectTask, resetTask, submitTask } from "@/api/workflowInstance";
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
import TaskDetailPanel from "./TaskDetailPanel";
import { scrollTaskDetailIntoView } from "./scrollTaskDetailIntoView";
import { canReset, canReject, canOwnerAct, type OwnerTaskAction } from "./taskPermissions";
import OwnerTaskActionDialog from "./OwnerTaskActionDialog";
import TaskFlowViewer from "./TaskFlowViewer";
import TaskSubmitPanel from "./TaskSubmitPanel";
import { useApiQuery, useApiMutation } from "@/hooks/queries/useApiQuery";

import type {
  ItemTaskInstanceVO,
  ItemTaskNodeVO,
  TaskClaimResultVO,
  TaskSubmitDTO,
} from "@/types/workflowInstance";

interface WorkflowInstanceProps {
  itemId: string;
  isProjectCreator: boolean;
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

function ItemWorkflowInstance({ itemId, isProjectCreator }: WorkflowInstanceProps) {
  const confirm = useConfirm();
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
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const [detailScrollNonce, setDetailScrollNonce] = useState(0);
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
  const [submitTarget, setSubmitTarget] = useState<{
    instance: ItemTaskInstanceVO;
    node: ItemTaskNodeVO;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ItemTaskInstanceVO | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [ownerTarget, setOwnerTarget] = useState<{
    action: OwnerTaskAction;
    instance: ItemTaskInstanceVO;
    title: string;
  } | null>(null);
  const sortedInstances = useMemo(() => getSortedInstances(instances), [instances]);
  const participantRoster = useMemo(
    () => (taskFlow ? buildParticipantRoster(taskFlow.itemTitle, instances) : ""),
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

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDetailScrollNonce((nonce) => nonce + 1);
  }, []);

  useLayoutEffect(() => {
    const detail = detailPanelRef.current;
    if (!selectedNodeId || !detail) return;
    scrollTaskDetailIntoView(detail);
  }, [detailScrollNonce, selectedNodeId]);

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
    setSubmitTarget({
      instance,
      node: targetNode,
    });
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

  async function handleReject(): Promise<void> {
    const current = instances.find((candidate) => candidate.id === rejectTarget?.id);
    if (
      !rejectTarget ||
      !current ||
      current.revision !== rejectTarget.revision ||
      !rejectComment.trim() ||
      rejectComment.trim().length > 500 ||
      !canReject(current, taskFlow?.nodes ?? [], instances, currentUserId)
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

  async function handleOwnerAction(reason?: string): Promise<boolean> {
    if (!ownerTarget) return false;
    if (ownerTarget.action === "reject" && (!reason?.trim() || reason.trim().length > 500))
      return false;
    const { action, instance } = ownerTarget;
    const current = instances.find((candidate) => candidate.id === instance.id);
    if (
      !current ||
      current.revision !== instance.revision ||
      !canOwnerAct(action, current, instances, isProjectCreator)
    ) {
      $tip("任务状态已变更或无操作权限，请刷新后重新操作", "error");
      return false;
    }
    return runInstanceAction(
      instance.id,
      () =>
        action === "cancel"
          ? abandonTask(instance.id, { expectedRevision: instance.revision })
          : rejectTask(instance.id, {
              expectedRevision: instance.revision,
              reviewComment: reason!.trim(),
            }),
      action === "cancel" ? "已取消接取" : "任务已打回",
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
          <h1 className="truncate text-lg font-semibold text-foreground">{taskFlow.name}</h1>
          {taskFlow.description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{taskFlow.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0"
          disabled={!participantRoster}
          title={participantRoster ? "复制参与名单" : "暂无参与人"}
          onClick={() => void handleCopyParticipantRoster()}
        >
          <Copy data-icon="inline-start" />
          复制参与名单
        </Button>
      </header>

      <TaskFlowViewer
        selectedNodeId={selectedNodeId}
        onSelectNode={selectNode}
        nodes={taskFlow.nodes}
        instances={sortedInstances}
        currentUserId={currentUserId}
        mutatingInstanceId={mutatingInstanceId}
        onClaim={(instanceId) =>
          void runInstanceAction(instanceId, () => claimTask(instanceId), "任务已接取")
        }
        onSubmit={(instance, node) => openSubmit(instance, node)}
      />

      {selectedNode ? (
        <div ref={detailPanelRef}>
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
                    ),
                    canOwnerCancel: canOwnerAct(
                      "cancel",
                      selectedInstance,
                      instances,
                      isProjectCreator,
                    ),
                    canOwnerReject: canOwnerAct(
                      "reject",
                      selectedInstance,
                      instances,
                      isProjectCreator,
                    ),
                    onOwnerAction: (action) =>
                      setOwnerTarget({
                        action,
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
                    onSubmit: () => openSubmit(selectedInstance),
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

      {submitTarget && (
        <TaskSubmitPanel
          key={submitTarget.instance.id}
          open
          taskInstanceId={submitTarget.instance.id}
          taskName={submitTarget.instance.name}
          submitFields={submitTarget.node.submitFields}
          onOpenChange={(open) => {
            if (!open) setSubmitTarget(null);
          }}
          submitting={
            actionMutation.isPending &&
            actionMutation.variables?.instanceId === submitTarget.instance.id
          }
          onSubmit={handleSubmit}
        />
      )}

      {ownerTarget && (
        <OwnerTaskActionDialog
          key={`${itemId}:${ownerTarget.instance.id}:${ownerTarget.action}:${ownerTarget.instance.revision}`}
          action={ownerTarget.action}
          instance={ownerTarget.instance}
          taskTitle={ownerTarget.title}
          onClose={() => setOwnerTarget(null)}
          onConfirm={handleOwnerAction}
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
