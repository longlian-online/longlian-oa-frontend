import { useEffect, useMemo, useRef, useState } from "react";
import { useMachine } from "@xstate/react";

import {
  abandonTask,
  claimTask,
  getItemTaskFlow,
  getItemTaskInstances,
  rejectTask,
  resetTask,
  submitTask,
} from "@/api/workflowInstance";
import { ApiError } from "@/api/apiError";
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
import type {
  ItemTaskFlowVO,
  ItemTaskInstanceVO,
  ItemTaskNodeVO,
  TaskSubmitDTO,
} from "@/types/workflowInstance";
import { createItemLifecycle } from "./itemLifecycle";
import TaskDetailPanel from "./TaskDetailPanel";
import { canReset, canReject } from "./taskPermissions";
import TaskFlowViewer from "./TaskFlowViewer";
import TaskSubmitPanel from "./TaskSubmitPanel";
import { workflowInstanceMachine } from "./workflowMachine";

interface WorkflowInstanceProps {
  itemId: string;
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

export default function WorkflowInstance({ itemId }: WorkflowInstanceProps) {
  const confirm = useConfirm();
  const currentUserId = getUserId();
  const lifecycle = useRef(createItemLifecycle(itemId));
  lifecycle.current.switchTo(itemId);
  const isCurrentLifecycle = lifecycle.current.capture();
  const loadGeneration = useRef(0);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowState, sendWorkflowEvent] = useMachine(workflowInstanceMachine);
  const [taskFlow, setTaskFlow] = useState<ItemTaskFlowVO | null>(null);
  const [instances, setInstances] = useState<ItemTaskInstanceVO[]>([]);
  const [detailRevision, setDetailRevision] = useState(0);
  const [submitTarget, setSubmitTarget] = useState<{
    instance: ItemTaskInstanceVO;
    node: ItemTaskNodeVO;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ItemTaskInstanceVO | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const sortedInstances = useMemo(() => getSortedInstances(instances), [instances]);
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
    setSelectedNodeId(null);
    setTaskFlow(null);
    setInstances([]);
    setSubmitTarget(null);
    setRejectTarget(null);
    setRejectComment("");
    void loadData();
  }, [itemId]);

  async function loadData(background = false): Promise<void> {
    const generation = ++loadGeneration.current;
    try {
      if (!background) sendWorkflowEvent({ type: "LOAD" });
      const [flowData, instanceData] = await Promise.all([
        getItemTaskFlow(itemId),
        getItemTaskInstances(itemId),
      ]);
      if (!isCurrentLifecycle() || generation !== loadGeneration.current) return;
      setLoadedItemId(itemId);
      setTaskFlow(flowData);
      setInstances(instanceData);
      setDetailRevision((current) => current + 1);
      sendWorkflowEvent({ type: "LOADED" });
    } catch (error) {
      if (!isCurrentLifecycle() || generation !== loadGeneration.current) {
        if (error instanceof ApiError) error.silence();
        return;
      }
      setLoadedItemId(itemId);
      sendWorkflowEvent({ type: background ? "ACTION_FAILED" : "LOAD_FAILED" });
    }
  }

  async function runInstanceAction(
    instanceId: string,
    action: () => Promise<void>,
    successMessage: string,
  ): Promise<boolean> {
    if (!isCurrentLifecycle() || workflowState.matches("mutating")) return false;
    try {
      sendWorkflowEvent({ type: "MUTATE", instanceId });
      await action();
      if (!isCurrentLifecycle()) return false;
      $tip(successMessage, "success");
      await loadData(true);
      return isCurrentLifecycle();
    } catch (error) {
      if (!isCurrentLifecycle()) {
        if (error instanceof ApiError) error.silence();
        return false;
      }
      sendWorkflowEvent({ type: "ACTION_FAILED" });
      return false;
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
    if (
      !rejectTarget ||
      !rejectComment.trim() ||
      !canReject(rejectTarget, taskFlow?.nodes ?? [], instances, currentUserId)
    )
      return;

    const succeeded = await runInstanceAction(
      rejectTarget.id,
      () => rejectTask(rejectTarget.id, { reviewComment: rejectComment.trim() }),
      "任务已打回",
    );
    if (succeeded) {
      setRejectTarget(null);
      setRejectComment("");
    }
  }

  async function handleAbandon(instanceId: string): Promise<void> {
    const confirmed = await confirm({
      title: "放弃任务？",
      description: "放弃后任务会回到待接取状态，其他成员可以重新接取。",
      confirmText: "放弃",
    });
    if (!confirmed) return;
    await runInstanceAction(instanceId, () => abandonTask(instanceId), "已放弃任务");
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

  const mutatingInstanceId = workflowState.context.mutatingInstanceId;

  if (loadedItemId !== itemId || workflowState.matches("loading")) {
    return <div className="py-8 text-center text-sm text-muted-foreground">正在加载任务流...</div>;
  }

  if (!taskFlow || workflowState.matches("error")) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
        <span>{workflowState.matches("error") ? "任务流加载失败" : "任务流不存在"}</span>
        {workflowState.matches("error") && (
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
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
      </header>

      <TaskFlowViewer
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
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
        <TaskDetailPanel
          key={`${itemId}:${selectedNode.id}`}
          node={selectedNode}
          instance={selectedInstance}
          revision={detailRevision}
          actions={
            selectedInstance && selectedNode.taskStatus !== null
              ? {
                  currentUserId,
                  mutating: mutatingInstanceId === selectedInstance.id,
                  canSubmit: isNodeUnlocked(selectedNode, taskFlow.nodes),
                  canReset: canReset(selectedInstance, currentUserId),
                  canReject: canReject(selectedInstance, taskFlow.nodes, instances, currentUserId),
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
          onSubmit={handleSubmit}
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
              disabled={!rejectComment.trim()}
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
