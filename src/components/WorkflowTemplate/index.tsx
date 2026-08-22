import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  ChevronRight,
  Languages,
  Megaphone,
  Plus,
  SquarePen,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  WorkflowTemplateScope,
  WorkshopTaskTemplateNodeVO,
  WorkshopTaskTemplateVO,
} from "@/types/workflowTemplate";

interface WorkflowTemplateCardProps {
  template: WorkshopTaskTemplateVO;
  onEdit: (template: WorkshopTaskTemplateVO) => void;
}

interface CreateWorkflowTemplateCardProps {
  onClick: () => void;
}

interface WorkflowStage {
  label: string;
  parallelCount: number;
  icon: LucideIcon;
}

const SCOPE_LABELS: Record<WorkflowTemplateScope, string> = {
  PERSONAL: "个人",
  ORGANIZATION: "组织",
};

function getNodeLabel(node: WorkshopTaskTemplateNodeVO): string {
  return node.customName || node.baseTaskName || "未命名任务";
}

function getNodeIcon(label: string): LucideIcon {
  if (label.includes("翻译") || label.includes("校对")) return Languages;
  if (label.includes("审核") || label.includes("编辑")) return SquarePen;
  if (label.includes("发布")) return Megaphone;
  if (label.includes("创建")) return BadgeCheck;
  return Star;
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
        icon: getNodeIcon(label),
      };
    });
}

function WorkflowParallelBadge({ count }: { count: number }) {
  if (count <= 1) {
    return <div className="mt-1 h-4" />;
  }

  return (
    <div className="mt-1 flex h-4 items-center justify-center">
      <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] font-bold leading-4 text-background">
        +{count - 1}
      </span>
    </div>
  );
}

function WorkflowDiagram({ nodes }: { nodes: WorkshopTaskTemplateNodeVO[] }) {
  const stages = getStages(nodes);

  if (stages.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
        暂无节点
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-start justify-center px-1">
      {stages.map((stage, index) => {
        const Icon = stage.icon;

        return (
          <div key={`${stage.label}-${index}`} className="flex min-w-0 flex-1 items-start">
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
                <Icon className="size-3.5" />
              </div>
              <WorkflowParallelBadge count={stage.parallelCount} />
              <div className="mt-1 max-w-12 truncate text-[11px] font-bold leading-4 text-muted-foreground">
                {stage.label}
              </div>
            </div>
            {index < stages.length - 1 && (
              <div className="mt-4 h-0.5 w-5 shrink-0 bg-foreground" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WorkflowTemplateCard({ template, onEdit }: WorkflowTemplateCardProps) {
  const taskCount = template.taskCount || template.nodes.length;

  return (
    <article className="flex min-h-[190px] min-w-0 flex-col rounded-xl border bg-card px-4 py-4 shadow-sm transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold leading-6 text-foreground">
            {template.name}
          </h2>
          {template.description && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {template.description}
            </p>
          )}
        </div>
        <Badge variant={template.scope === "PERSONAL" ? "secondary" : "outline"}>
          {SCOPE_LABELS[template.scope]}
        </Badge>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center py-4">
        <WorkflowDiagram nodes={template.nodes} />
      </div>

      <div className="flex items-center justify-between text-xs leading-[18px]">
        <div className="text-foreground">任务数：{taskCount}</div>
        {template.isMine ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onEdit(template)}
          >
            编辑
            <ChevronRight data-icon="inline-end" />
          </Button>
        ) : (
          <span className="text-muted-foreground">可用于创建项目</span>
        )}
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
        "flex min-h-[190px] min-w-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-card text-center shadow-sm transition-colors",
        "hover:border-foreground/30 hover:bg-secondary/40",
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full border-2 border-muted-foreground text-muted-foreground">
        <Plus className="size-5" />
      </div>
      <div className="mt-3 text-sm font-medium leading-5 text-foreground">创建新流程</div>
      <div className="mt-1 text-xs leading-[18px] text-muted-foreground">
        用原子任务组合一个流程模板
      </div>
    </button>
  );
}
