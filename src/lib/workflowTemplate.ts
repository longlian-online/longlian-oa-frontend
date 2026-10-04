import type { OrganizationTaskTemplateNodeVO } from "@/types/organizationAdmin";
import type { WorkshopTaskTemplateNodeVO } from "@/types/workflowTemplate";

export function toWorkflowTemplateNodes(
  nodes: OrganizationTaskTemplateNodeVO[],
): WorkshopTaskTemplateNodeVO[] {
  return nodes.flatMap((node) => {
    if (!node.baseTaskId || node.sort === undefined) return [];
    return [
      {
        baseTaskId: node.baseTaskId,
        baseTaskName: node.baseTaskName,
        baseTaskIconName: node.baseTaskIconName,
        baseTaskIconUrl: node.baseTaskIconUrl,
        sort: node.sort,
        parallelSort: node.parallelSort,
      },
    ];
  });
}
