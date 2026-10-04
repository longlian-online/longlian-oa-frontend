import { useEffect, useState } from "react";
import { getTaskInstanceDetail } from "@/api/workflowInstance";
import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";

interface TaskDetailPanelProps {
  node: ItemTaskNodeVO;
  instance?: ItemTaskInstanceVO;
}

export default function TaskDetailPanel({ node, instance }: TaskDetailPanelProps) {
  const [metadata, setMetadata] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const instanceId = node.taskStatus === null ? undefined : instance?.id;
  useEffect(() => {
    let active = true;
    setMetadata(null);
    setError("");
    setLoading(Boolean(instanceId));
    if (instanceId) {
      void getTaskInstanceDetail(instanceId)
        .then((detail) => {
          if (active) setMetadata(detail.metadata ?? null);
        })
        .catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : "任务详情加载失败");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [instanceId, instance?.status, instance?.completedAt]);
  return (
    <section className="rounded-xl border bg-card p-4" aria-live="polite">
      <h2 className="text-sm font-semibold">{node.name} · 任务详情</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        第 {node.sort} 阶段 · {instance?.assigneeNickname || "暂无执行人"}
      </p>
      {!instanceId ? (
        <p className="mt-3 text-sm text-muted-foreground">任务尚未解锁，完成前置阶段后可接取。</p>
      ) : loading ? (
        <p className="mt-3 text-sm text-muted-foreground">正在加载任务详情...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : (
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-secondary/60 p-3 text-xs">
          {metadata || "暂无提交元数据"}
        </pre>
      )}
    </section>
  );
}
