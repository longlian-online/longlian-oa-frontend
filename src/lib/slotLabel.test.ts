import { expect, test } from "vite-plus/test";

import { formatSlotLabel, formatTaskTitle, slotPosition, type SlotNode } from "@/lib/slotLabel";

test("并行槽写成名称 · 位次/总数，并拼进项目标题", (): void => {
  const slot = { name: "翻译", slotIndex: 2, slotTotal: 3, serialStep: null };

  expect(formatSlotLabel(slot)).toBe("翻译 · 2/3");
  expect(formatTaskTitle("项目", slot)).toBe("项目 · 翻译 · 2/3");
});

test("单槽不补号", (): void => {
  expect(formatSlotLabel({ name: "翻译", slotIndex: 1, slotTotal: 1, serialStep: null })).toBe(
    "翻译",
  );
  expect(formatTaskTitle("项目", { name: "翻译", slotIndex: 1, slotTotal: 1 })).toBe("项目 · 翻译");
});

test("串行同名写成第 N 步", (): void => {
  expect(formatSlotLabel({ name: "校对", slotIndex: 1, slotTotal: 1, serialStep: 3 })).toBe(
    "校对（第 3 步）",
  );
  expect(formatTaskTitle("项目", { name: "校对", slotTotal: 1, serialStep: 3 })).toBe(
    "项目 · 校对（第 3 步）",
  );
});

test("串行同名且并行时两种序号都保留", (): void => {
  expect(formatSlotLabel({ name: "校对", slotIndex: 1, slotTotal: 2, serialStep: 2 })).toBe(
    "校对（第 2 步） · 1/2",
  );
});

test("等待文案复用同一套槽位名", (): void => {
  expect(`等${formatSlotLabel({ name: "校对", slotIndex: 1, slotTotal: 1, serialStep: 2 })}`).toBe(
    "等校对（第 2 步）",
  );
});

test("从节点列表推导并行位次和串行步次", (): void => {
  const nodes: SlotNode[] = [
    { id: "1", name: "校对", sort: 1, parallelSort: 1 },
    { id: "2", name: "校对", sort: 2, parallelSort: 1 },
    { id: "4", name: "校对", sort: 2, parallelSort: 2 },
    { id: "10", name: "翻译", sort: 3, parallelSort: 1 },
  ];

  expect(formatTaskTitle("项目", slotPosition(nodes[2], nodes))).toBe(
    "项目 · 校对（第 2 步） · 2/2",
  );
  expect(formatSlotLabel(slotPosition(nodes[3], nodes))).toBe("翻译");
  expect(formatSlotLabel(slotPosition(nodes[0], nodes))).toBe("校对（第 1 步）");
});
