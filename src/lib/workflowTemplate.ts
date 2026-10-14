import type {
  OrganizationTaskTemplatePreviewNodeVO,
  OrganizationTaskTemplateVO,
} from "@/types/organizationAdmin";
import type { WorkshopTaskTemplateVO, WorkshopTaskTemplateNodeVO } from "@/types/workflowTemplate";

export function toWorkflowTemplateNodes(
  nodes: OrganizationTaskTemplatePreviewNodeVO[],
): WorkshopTaskTemplateNodeVO[] {
  return nodes.flatMap((node) => {
    if (!node.baseTaskId || node.sort === undefined) return [];
    return [
      {
        baseTaskId: node.baseTaskId,
        baseTaskName: node.baseTaskName,
        baseTaskIcon: node.baseTaskIcon,
        sort: node.sort,
        parallelSort: node.parallelSort,
      },
    ];
  });
}

export function toOrganizationWorkflowCard(
  template: OrganizationTaskTemplateVO,
): WorkshopTaskTemplateVO {
  const nodes = toWorkflowTemplateNodes(template.nodes);
  return {
    id: template.id,
    name: template.name ?? "未命名工作流",
    description: template.description,
    scope: "ORGANIZATION",
    taskCount: template.taskCount,
    nodes,
    isMine: true,
  };
}
