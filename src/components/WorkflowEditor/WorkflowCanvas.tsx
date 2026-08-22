import { Layers2 } from "lucide-react";

import type { BaseTaskVO } from "@/types/workflowTemplate";
import WorkflowNode from "./WorkflowNode";
import { groupNodes, type WorkflowEditorNode } from "./utils";

interface WorkflowCanvasProps {
  nodes: WorkflowEditorNode[];
  baseTasks: BaseTaskVO[];
  onDragStart: (localId: string) => void;
  onMoveToStage: (localId: string, stageIndex: number) => void;
  onMoveToParallelGroup: (localId: string, targetSort: number) => void;
  onRename: (localId: string, customName: string) => void;
  onRemove: (localId: string) => void;
}

function StageDropZone({
  stageIndex,
  onDropNode,
}: {
  stageIndex: number;
  onDropNode: (localId: string, stageIndex: number) => void;
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const localId = event.dataTransfer.getData("text/plain");
        if (localId) onDropNode(localId, stageIndex);
      }}
      className="h-28 w-4 rounded-full border border-dashed border-transparent transition-colors hover:border-foreground/30 hover:bg-secondary"
      aria-label="拖到这里调整阶段顺序"
    />
  );
}

export default function WorkflowCanvas({
  nodes,
  baseTasks,
  onDragStart,
  onMoveToStage,
  onMoveToParallelGroup,
  onRename,
  onRemove,
}: WorkflowCanvasProps) {
  const groupedNodes = groupNodes(nodes);

  return (
    <section className="flex h-[calc(100svh-8.5rem)] min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers2 className="h-4 w-4 text-muted-foreground" />
          节点编排
        </div>
        <div className="text-xs text-muted-foreground">拖到列间调整顺序，拖到列内设为并行</div>
      </div>

      <div className="flex flex-1 items-center overflow-auto p-6">
        {groupedNodes.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Layers2 className="mb-3 h-8 w-8" />
            从右侧任务库添加节点
          </div>
        ) : (
          <div className="flex min-w-max items-center gap-3">
            <StageDropZone stageIndex={0} onDropNode={onMoveToStage} />
            {groupedNodes.map((group, groupIndex) => (
              <div key={group[0].sort} className="flex items-center gap-3">
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const localId = event.dataTransfer.getData("text/plain");
                    if (localId) onMoveToParallelGroup(localId, group[0].sort);
                  }}
                  className="flex min-h-32 flex-col justify-center gap-3 rounded-xl border border-dashed border-transparent p-2 transition-colors hover:border-foreground/20 hover:bg-secondary/40"
                >
                  {group.map((node) => (
                    <WorkflowNode
                      key={node.localId}
                      node={node}
                      baseTasks={baseTasks}
                      onDragStart={onDragStart}
                      onRename={onRename}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
                {groupIndex < groupedNodes.length - 1 && (
                  <div className="h-0.5 w-8 bg-foreground" aria-hidden="true" />
                )}
                <StageDropZone stageIndex={groupIndex + 1} onDropNode={onMoveToStage} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
