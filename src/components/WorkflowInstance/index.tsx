import { useEffect, useMemo, useState } from "react";

import {
  abandonTask,
  claimTask,
  getItemTaskFlow,
  getItemTaskInstances,
  getTaskInstanceDetail,
  rejectTask,
  resetTask,
  submitTask,
} from "@/api/workflowInstance";
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
  TaskInstanceDetailVO,
} from "@/types/workflowInstance";
import TaskActionPanel from "./TaskActionPanel";
import TaskFlowViewer from "./TaskFlowViewer";
import TaskSubmitPanel from "./TaskSubmitPanel";

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

export default function WorkflowInstance({ itemId }: WorkflowInstanceProps) {
  const confirm = useConfirm();
  const currentUserId = getUserId();
  const [taskFlow, setTaskFlow] = useState<ItemTaskFlowVO | null>(null);
  const [instances, setInstances] = useState<ItemTaskInstanceVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutatingInstanceId, setMutatingInstanceId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<{
    instance: ItemTaskInstanceVO;
    node?: ItemTaskNodeVO;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ItemTaskInstanceVO | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [detailTarget, setDetailTarget] = useState<ItemTaskInstanceVO | null>(null);
  const [detail, setDetail] = useState<TaskInstanceDetailVO | null>(null);

  const sortedInstances = useMemo(() => getSortedInstances(instances), [instances]);

  useEffect(() => {
    void loadData();
  }, [itemId]);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      const [flowData, instanceData] = await Promise.all([
        getItemTaskFlow(itemId),
        getItemTaskInstances(itemId),
      ]);
      setTaskFlow(flowData);
      setInstances(instanceData);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "任务流加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  async function runInstanceAction(
    instanceId: string,
    action: () => Promise<void>,
    successMessage: string,
  ): Promise<void> {
    try {
      setMutatingInstanceId(instanceId);
      await action();
      $tip(successMessage, "success");
      await loadData();
    } catch (error) {
      $tip(error instanceof Error ? error.message : "任务操作失败", "error");
    } finally {
      setMutatingInstanceId(null);
    }
  }

  function openSubmit(instance: ItemTaskInstanceVO, node?: ItemTaskNodeVO): void {
    setSubmitTarget({
      instance,
      node: node ?? findNodeByInstance(instance, taskFlow?.nodes ?? []),
    });
  }

  async function handleSubmit(metadata: Record<string, unknown>): Promise<void> {
    if (!submitTarget) return;

    await runInstanceAction(
      submitTarget.instance.id,
      () => submitTask(submitTarget.instance.id, { metadata: JSON.stringify(metadata) }),
      "任务已提交",
    );
    setSubmitTarget(null);
  }

  async function handleReject(): Promise<void> {
    if (!rejectTarget || !rejectComment.trim()) return;

    await runInstanceAction(
      rejectTarget.id,
      () => rejectTask(rejectTarget.id, { reviewComment: rejectComment.trim() }),
      "任务已打回",
    );
    setRejectTarget(null);
    setRejectComment("");
  }

  async function handleViewDetail(instance: ItemTaskInstanceVO): Promise<void> {
    try {
      const data = await getTaskInstanceDetail(instance.id);
      setDetail(data);
      setDetailTarget(instance);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "任务详情加载失败", "error");
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
    const confirmed = await confirm({
      title: "重置提交？",
      description: "重置后任务会回到待提交状态，需要重新提交。",
      confirmText: "重置",
    });
    if (!confirmed) return;
    await runInstanceAction(instanceId, () => resetTask(instanceId), "任务已重置");
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">正在加载任务流...</div>;
  }

  if (!taskFlow) {
    return <div className="py-8 text-center text-sm text-muted-foreground">任务流不存在</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">{taskFlow.name}</h1>
        {taskFlow.description && (
          <p className="mt-1 text-sm text-muted-foreground">{taskFlow.description}</p>
        )}
      </section>

      <TaskFlowViewer
        nodes={taskFlow.nodes}
        instances={sortedInstances}
        currentUserId={currentUserId}
        mutatingInstanceId={mutatingInstanceId}
        onClaim={(instanceId) =>
          void runInstanceAction(instanceId, () => claimTask(instanceId), "任务已接取")
        }
        onSubmit={(instance, node) => openSubmit(instance, node)}
      />

      <TaskActionPanel
        instances={sortedInstances}
        currentUserId={currentUserId}
        mutatingInstanceId={mutatingInstanceId}
        onClaim={(instanceId) =>
          void runInstanceAction(instanceId, () => claimTask(instanceId), "任务已接取")
        }
        onSubmit={(instance) => openSubmit(instance)}
        onAbandon={(instanceId) => void handleAbandon(instanceId)}
        onReject={setRejectTarget}
        onReset={(instanceId) => void handleReset(instanceId)}
        onViewDetail={(instance) => void handleViewDetail(instance)}
      />

      <TaskSubmitPanel
        open={Boolean(submitTarget)}
        taskInstanceId={submitTarget?.instance.id}
        taskName={submitTarget?.instance.name}
        metaSchema={submitTarget?.node?.metaSchema}
        onOpenChange={(open) => {
          if (!open) setSubmitTarget(null);
        }}
        onSubmit={handleSubmit}
      />

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

      <Dialog
        open={Boolean(detailTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTarget(null);
            setDetail(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交详情{detailTarget ? `：${detailTarget.name}` : ""}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto rounded-xl bg-secondary/60 p-3 text-xs text-foreground">
            {detail?.metadata || "暂无提交元数据"}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
