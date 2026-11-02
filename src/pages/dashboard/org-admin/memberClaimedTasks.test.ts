import { expect, test } from "vite-plus/test";

import {
  claimedTaskTabCount,
  claimedTaskTitle,
  claimedTaskWaitingLabel,
  filterClaimedTasks,
} from "./memberClaimedTasks";
import type { MemberClaimedTaskItemVO } from "@/types/organizationAdmin";

const waiting: MemberClaimedTaskItemVO = {
  instanceId: "2",
  itemId: "12",
  projectId: "8",
  itemTitle: "第 12 话",
  projectName: "夏日重现",
  nodeName: "校对",
  slotIndex: 1,
  slotTotal: 2,
  serialStep: 2,
  claimedAt: "2026-10-01 10:00:00",
  bucket: "WAITING",
  waitingStageName: "翻译",
  waitingSlotIndex: 2,
  waitingSlotTotal: 3,
  waitingSerialStep: null,
};

const submittable: MemberClaimedTaskItemVO = {
  ...waiting,
  instanceId: "4",
  nodeName: "嵌字",
  slotIndex: 2,
  slotTotal: 2,
  serialStep: null,
  bucket: "SUBMITTABLE",
  waitingStageName: null,
  waitingSlotIndex: null,
  waitingSlotTotal: null,
  waitingSerialStep: null,
};

test("槽位文案与工坊待办一致", () => {
  expect(claimedTaskTitle(waiting)).toBe("第 12 话 · 校对（第 2 步） · 1/2");
  expect(claimedTaskTitle(submittable)).toBe("第 12 话 · 嵌字 · 2/2");
  expect(claimedTaskWaitingLabel(waiting)).toBe("等翻译 · 2/3");
  expect(claimedTaskWaitingLabel(submittable)).toBeNull();
});

test("按 Tab 过滤任务", () => {
  const tasks = [waiting, submittable];
  expect(filterClaimedTasks(tasks, "ALL")).toHaveLength(2);
  expect(filterClaimedTasks(tasks, "SUBMITTABLE")).toEqual([submittable]);
  expect(filterClaimedTasks(tasks, "WAITING")).toEqual([waiting]);
});

test("Tab 数量取服务端口径", () => {
  const counts = { totalCount: 3, submittableCount: 2, waitingCount: 1 };
  expect(claimedTaskTabCount("ALL", counts)).toBe(3);
  expect(claimedTaskTabCount("SUBMITTABLE", counts)).toBe(2);
  expect(claimedTaskTabCount("WAITING", counts)).toBe(1);
});
