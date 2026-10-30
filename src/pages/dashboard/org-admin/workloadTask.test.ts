import { expect, test } from "vite-plus/test";

import { workloadTaskPath, workloadTaskState, workloadTaskTitle } from "./workloadTask";
import type { OrganizationMemberWorkloadTaskVO } from "@/types/organizationAdmin";

const task: OrganizationMemberWorkloadTaskVO = {
  instanceId: "2",
  itemId: "12",
  projectId: "8",
  projectName: "夏日重现",
  itemTitle: "第 12 话",
  nodeName: "校对",
  slotIndex: 1,
  slotTotal: 2,
  serialStep: 2,
  waitingStageName: "翻译",
  waitingSlotIndex: 2,
  waitingSlotTotal: 3,
  waitingSerialStep: null,
};

test("任务名带上企划、项目和槽位", () => {
  expect(workloadTaskTitle(task)).toBe("夏日重现 / 第 12 话 · 校对（第 2 步） · 1/2");
  expect(workloadTaskState(task)).toBe("等翻译 · 2/3");
  expect(workloadTaskPath(task)).toBe("/dashboard/planning/8/items/12?taskInstanceId=2");
});

test("没有前置时是可提交", () => {
  expect(workloadTaskState({ ...task, waitingStageName: null })).toBe("可提交");
});
