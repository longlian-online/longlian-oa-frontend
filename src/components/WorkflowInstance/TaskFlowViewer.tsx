import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";
import TaskNodeCard from "./TaskNodeCard";

interface TaskFlowViewerProps {
  nodes: ItemTaskNodeVO[];
  instances: ItemTaskInstanceVO[];
  currentUserId?: string | null;
  mutatingInstanceId?: string | null;
  onClaim: (instanceId: string) => void;
  onSubmit: (instance: ItemTaskInstanceVO, node: ItemTaskNodeVO) => void;
}

interface NodeGroup {
  sort: number;
  nodes: ItemTaskNodeVO[];
}

function groupNodes(nodes: ItemTaskNodeVO[]): NodeGroup[] {
  const grouped = new Map<number, ItemTaskNodeVO[]>();
  nodes.forEach((node) => {
    const group = grouped.get(node.sort) ?? [];
    group.push(node);
    grouped.set(node.sort, group);
  });

  return Array.from(grouped.entries())
    .sort(([prevSort], [nextSort]) => prevSort - nextSort)
    .map(([sort, group]) => ({
      sort,
      nodes: group.sort((prev, next) => prev.parallelSort - next.parallelSort),
    }));
}

function findInstance(
  node: ItemTaskNodeVO,
  instances: ItemTaskInstanceVO[],
): ItemTaskInstanceVO | undefined {
  if (node.taskInstanceId) {
    return instances.find((instance) => instance.id === node.taskInstanceId);
  }

  return instances.find(
    (instance) => instance.sort === node.sort && instance.parallelSort === node.parallelSort,
  );
}

export default function TaskFlowViewer({
  nodes,
  instances,
  currentUserId,
  mutatingInstanceId,
  onClaim,
  onSubmit,
}: TaskFlowViewerProps) {
  const groups = groupNodes(nodes);

  if (groups.length === 0) {
    return (
      <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
        暂无任务节点
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border bg-card p-5">
      <div className="flex min-w-max items-center gap-4">
        {groups.map((group, groupIndex) => (
          <div key={group.sort} className="flex items-center gap-4">
            <div className="flex flex-col gap-3">
              {group.nodes.map((node) => {
                const instance = findInstance(node, instances);
                return (
                  <TaskNodeCard
                    key={node.id}
                    node={node}
                    instance={instance}
                    currentUserId={currentUserId}
                    mutating={Boolean(instance && mutatingInstanceId === instance.id)}
                    onClaim={onClaim}
                    onSubmit={onSubmit}
                  />
                );
              })}
            </div>
            {groupIndex < groups.length - 1 && (
              <div className="h-0.5 w-10 bg-foreground" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
