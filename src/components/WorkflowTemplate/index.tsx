import { Ban, CheckCircle2, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WorkflowTaskIcon from "@/components/WorkflowTaskIcon";
import type {
  WorkflowTemplateScope,
  WorkshopTaskTemplateNodeVO,
  WorkshopTaskTemplateVO,
} from "@/types/workflowTemplate";

interface WorkflowTemplateCardProps {
  template: WorkshopTaskTemplateVO;
  onEdit: (template: WorkshopTaskTemplateVO) => void;
  onDisable?: (template: WorkshopTaskTemplateVO) => void;
  onStatusChange?: (template: WorkshopTaskTemplateVO) => void;
  status?: "ENABLED" | "DISABLED";
  disabling?: boolean;
}

interface CreateWorkflowTemplateCardProps {
  onClick: () => void;
}

interface WorkflowStage {
  label: string;
  parallelCount: number;
  taskName: string;
  iconName?: string;
}

/** Max stage chips shown on a card before collapsing the rest into「共 N 步」. */
const MAX_VISIBLE_STAGES = 5;

const SCOPE_LABELS: Record<WorkflowTemplateScope, string> = {
  PERSONAL: "个人",
  ORGANIZATION: "组织",
};

function getNodeLabel(node: WorkshopTaskTemplateNodeVO): string {
  return node.customName || node.baseTaskName || "未命名任务";
}

function getStages(nodes: WorkshopTaskTemplateNodeVO[]): WorkflowStage[] {
  const grouped = new Map<number, WorkshopTaskTemplateNodeVO[]>();

  nodes.forEach((node) => {
    const group = grouped.get(node.sort) ?? [];
    group.push(node);
    grouped.set(node.sort, group);
  });

  return Array.from(grouped.entries())
    .sort(([prevSort], [nextSort]) => prevSort - nextSort)
    .map(([, group]) => {
      const sortedGroup = [...group].sort(
        (prev, next) => (prev.parallelSort ?? 1) - (next.parallelSort ?? 1),
      );
      const label = getNodeLabel(sortedGroup[0]);

      return {
        label,
        parallelCount: sortedGroup.length,
        taskName: sortedGroup[0].baseTaskName || label,
        iconName: sortedGroup[0].baseTaskIcon,
      };
    });
}

function getDiagramStages(nodes: WorkshopTaskTemplateNodeVO[]): {
  visible: WorkflowStage[];
  totalSteps: number;
  hasOverflow: boolean;
} {
  const stages = getStages(nodes);
  const totalSteps = stages.length;

  if (totalSteps <= MAX_VISIBLE_STAGES) {
    return { visible: stages, totalSteps, hasOverflow: false };
  }

  return {
    visible: stages.slice(0, MAX_VISIBLE_STAGES - 1),
    totalSteps,
    hasOverflow: true,
  };
}

function WorkflowParallelBadge({ count }: { count: number }) {
  if (count <= 1) {
    return null;
  }

  return (
    <span className="absolute -right-1.5 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none tabular-nums text-primary-foreground ring-2 ring-card">
      +{count - 1}
    </span>
  );
}

function WorkflowStageOverflowSummary({ totalSteps }: { totalSteps: number }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center" title={`共 ${totalSteps} 步`}>
      <div className="flex size-9 items-center justify-center rounded-full border border-dashed border-foreground/25 bg-muted/80 text-xs font-semibold text-muted-foreground">
        …
      </div>
      <div className="mt-2 max-w-14 truncate text-[11px] font-medium leading-4 tabular-nums text-muted-foreground">
        共 {totalSteps} 步
      </div>
    </div>
  );
}

function WorkflowDiagram({ nodes }: { nodes: WorkshopTaskTemplateNodeVO[] }) {
  const { visible, totalSteps, hasOverflow } = getDiagramStages(nodes);

  if (totalSteps === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
        暂无节点
      </div>
    );
  }

  const itemCount = visible.length + (hasOverflow ? 1 : 0);

  return (
    <div className="flex w-full min-w-0 items-start justify-center overflow-hidden px-1">
      <div className="inline-flex max-w-full items-start justify-center">
        {visible.map((stage, index) => {
          const showConnector = index < itemCount - 1;

          return (
            <div key={`${stage.label}-${index}`} className="flex shrink-0 items-start">
              <div className="flex w-14 flex-col items-center">
                <div className="relative flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-2xs">
                  <WorkflowTaskIcon
                    taskName={stage.taskName}
                    iconName={stage.iconName}
                    className="size-4"
                  />
                  <WorkflowParallelBadge count={stage.parallelCount} />
                </div>
                <div className="mt-2 max-w-14 truncate text-[11px] font-medium leading-4 text-muted-foreground">
                  {stage.label}
                </div>
              </div>
              {showConnector && (
                <div
                  className="mt-[17px] h-[1.5px] w-6 shrink-0 rounded-full bg-foreground/20"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
        {hasOverflow && <WorkflowStageOverflowSummary totalSteps={totalSteps} />}
      </div>
    </div>
  );
}

export function WorkflowTemplateCard({
  template,
  onEdit,
  onDisable,
  onStatusChange,
  status,
  disabling = false,
}: WorkflowTemplateCardProps) {
  const taskCount = template.taskCount || template.nodes.length;
  const isDisabled = status === "DISABLED";
  const handleStatusChange = onStatusChange ?? onDisable;

  return (
    <article className="flex min-h-[188px] min-w-0 flex-col rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_3px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] duration-200 hover:border-foreground/15 hover:shadow-[0_6px_20px_rgb(0_0_0/0.06)] dark:shadow-none dark:hover:border-foreground/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-6 text-foreground">
            {template.name}
          </h2>
          {template.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {template.description}
            </p>
          )}
        </div>
        <Badge
          variant={template.scope === "PERSONAL" ? "secondary" : "outline"}
          className="h-5.5 shrink-0 rounded-full px-2.5 text-[11px] font-normal"
        >
          {SCOPE_LABELS[template.scope]}
        </Badge>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center py-4">
        <WorkflowDiagram nodes={template.nodes} />
      </div>

      <div className="flex items-center justify-between text-xs leading-[18px]">
        <div className="tabular-nums text-muted-foreground">任务数：{taskCount}</div>
        <div className="flex items-center gap-1">
          {handleStatusChange && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1 rounded-full px-2.5 text-xs",
                isDisabled
                  ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  : "text-destructive hover:bg-destructive/10 hover:text-destructive",
              )}
              disabled={disabling}
              onClick={() => handleStatusChange(template)}
            >
              {isDisabled ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
              {isDisabled ? "启用" : "禁用"}
            </Button>
          )}
          {template.isMine ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-full px-2.5 text-xs"
              onClick={() => onEdit(template)}
            >
              编辑
              <ChevronRight data-icon="inline-end" />
            </Button>
          ) : (
            <span className="text-muted-foreground">可用于创建项目</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function CreateWorkflowTemplateCard({ onClick }: CreateWorkflowTemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[188px] min-w-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 text-center transition-colors duration-200",
        "hover:border-foreground/25 hover:bg-card",
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors duration-200 group-hover:bg-accent-soft group-hover:text-accent-soft-foreground">
        <Plus className="size-5" />
      </div>
      <div className="mt-3 text-sm font-medium leading-5 text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
        创建新流程
      </div>
    </button>
  );
}
