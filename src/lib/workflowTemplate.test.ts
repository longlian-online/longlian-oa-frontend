import { expect, test } from "vite-plus/test";

import { toOrganizationWorkflowCard } from "@/lib/workflowTemplate";
import type { OrganizationTaskTemplateVO } from "@/types/organizationAdmin";

test("uses list stage preview and keeps a zero task count", (): void => {
  const template: OrganizationTaskTemplateVO = {
    id: "8",
    name: "翻译流程",
    description: "阶段预览",
    refCount: 1,
    status: "ENABLED",
    taskCount: 3,
    nodes: [
      {
        baseTaskId: "1",
        baseTaskName: "翻译",
        baseTaskIcon: "Languages",
        sort: 1,
        parallelSort: 1,
      },
      { baseTaskId: "2", baseTaskName: "校对", baseTaskIcon: "BookOpen", sort: 1, parallelSort: 2 },
      { sort: 2 },
      { baseTaskId: "1", baseTaskName: "发布", baseTaskIcon: "Send", sort: 2, parallelSort: 1 },
    ],
  };

  expect(toOrganizationWorkflowCard(template)).toEqual({
    id: "8",
    name: "翻译流程",
    description: "阶段预览",
    scope: "ORGANIZATION",
    taskCount: 3,
    isMine: true,
    nodes: [
      {
        baseTaskId: "1",
        baseTaskName: "翻译",
        baseTaskIcon: "Languages",
        sort: 1,
        parallelSort: 1,
      },
      { baseTaskId: "2", baseTaskName: "校对", baseTaskIcon: "BookOpen", sort: 1, parallelSort: 2 },
      { baseTaskId: "1", baseTaskName: "发布", baseTaskIcon: "Send", sort: 2, parallelSort: 1 },
    ],
  });

  expect(
    toOrganizationWorkflowCard({
      id: "9",
      refCount: 0,
      status: "DISABLED",
      taskCount: 0,
      nodes: [],
    }).taskCount,
  ).toBe(0);
});

test("falls back to node length when an older list omits task count", (): void => {
  expect(
    toOrganizationWorkflowCard({
      id: "9",
      refCount: 0,
      status: "ENABLED",
      nodes: [{ baseTaskId: "1", baseTaskName: "翻译", sort: 1 }],
    }),
  ).toMatchObject({
    name: "未命名工作流",
    taskCount: 1,
    nodes: [{ baseTaskId: "1", baseTaskName: "翻译", sort: 1, parallelSort: undefined }],
  });
});
