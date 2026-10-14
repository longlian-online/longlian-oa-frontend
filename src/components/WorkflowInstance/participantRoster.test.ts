import { describe, expect, test } from "vite-plus/test";

import type { ItemTaskInstanceVO } from "@/types/workflowInstance";
import { buildParticipantRoster } from "./participantRoster";

function instance(
  overrides: Partial<ItemTaskInstanceVO> & Pick<ItemTaskInstanceVO, "id">,
): ItemTaskInstanceVO {
  return {
    name: "翻译",
    status: "CLAIMED",
    sort: 1,
    parallelSort: 1,
    createdAt: "2026-10-13 10:00:00",
    ...overrides,
  };
}

describe("buildParticipantRoster", () => {
  test("按阶段顺序聚合同一人的任务", () => {
    const instances = [
      instance({ id: "3", name: "嵌字", sort: 3, assigneeId: "u1", assigneeNickname: "阿岚" }),
      instance({ id: "1", name: "翻译", sort: 1, assigneeId: "u2", assigneeNickname: "小K" }),
      instance({ id: "2", name: "校对", sort: 2, assigneeId: "u1", assigneeNickname: "阿岚" }),
    ];

    expect(buildParticipantRoster("第3话", instances)).toBe(
      ["第3话 · 参与名单", "小K：翻译", "阿岚：校对、嵌字"].join("\n"),
    );
  });

  test("忽略没有执行人的任务，全部未接取时返回空字符串", () => {
    expect(buildParticipantRoster("第3话", [instance({ id: "1", status: "PENDING" })])).toBe("");
    expect(
      buildParticipantRoster("第3话", [
        instance({ id: "1", status: "PENDING" }),
        instance({ id: "2", name: "校对", assigneeId: "u1", assigneeNickname: "小K" }),
      ]),
    ).toBe(["第3话 · 参与名单", "小K：校对"].join("\n"));
  });

  test("并行同名任务合并并标注数量", () => {
    const instances = [
      instance({
        id: "1",
        name: "翻译",
        parallelSort: 1,
        assigneeId: "u1",
        assigneeNickname: "阿岚",
      }),
      instance({
        id: "2",
        name: "翻译",
        parallelSort: 2,
        assigneeId: "u1",
        assigneeNickname: "阿岚",
      }),
      instance({ id: "3", name: "校对", sort: 2, assigneeId: "u2", assigneeNickname: "小K" }),
    ];

    expect(buildParticipantRoster("第3话", instances)).toBe(
      ["第3话 · 参与名单", "阿岚：翻译×2", "小K：校对"].join("\n"),
    );
  });

  test("缺少项目标题时只输出名单标题", () => {
    expect(
      buildParticipantRoster("", [
        instance({ id: "1", assigneeId: "u1", assigneeNickname: "阿岚" }),
      ]),
    ).toBe(["参与名单", "阿岚：翻译"].join("\n"));
  });
});
