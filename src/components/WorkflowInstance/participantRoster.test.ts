import { describe, expect, test } from "vite-plus/test";

import type { ItemTaskInstanceVO } from "@/types/workflowInstance";
import { buildParticipantRoster } from "./participantRoster";

function instance(
  overrides: Partial<ItemTaskInstanceVO> & Pick<ItemTaskInstanceVO, "id">,
): ItemTaskInstanceVO {
  return {
    revision: "0",
    name: "翻译",
    status: "CLAIMED",
    sort: 1,
    parallelSort: 1,
    createdAt: "2026-10-13 10:00:00",
    ...overrides,
  };
}

describe("buildParticipantRoster", () => {
  test("按阶段顺序每个任务单独一段，段间空一行", () => {
    const instances = [
      instance({ id: "3", name: "嵌字", sort: 3, assigneeId: "u1", assigneeNickname: "阿岚" }),
      instance({ id: "1", name: "翻译", sort: 1, assigneeId: "u2", assigneeNickname: "小K" }),
      instance({ id: "2", name: "校对", sort: 2, assigneeId: "u1", assigneeNickname: "阿岚" }),
    ];

    expect(buildParticipantRoster(instances)).toBe(
      ["翻译：小K", "校对：阿岚", "嵌字：阿岚"].join("\n\n"),
    );
  });

  test("忽略没有执行人的任务，全部未接取时返回空字符串", () => {
    expect(buildParticipantRoster([instance({ id: "1", status: "PENDING" })])).toBe("");
    expect(
      buildParticipantRoster([
        instance({ id: "1", name: "图源", status: "PENDING" }),
        instance({ id: "2", name: "校对", assigneeId: "u1", assigneeNickname: "小K" }),
        instance({ id: "3", name: "嵌字", sort: 3, assigneeNickname: "   " }),
      ]),
    ).toBe("校对：小K");
  });

  test("同任务多名参与者按并行顺序用顿号连接", () => {
    const instances = [
      instance({
        id: "2",
        name: "翻译",
        parallelSort: 2,
        assigneeId: "u2",
        assigneeNickname: "小K",
      }),
      instance({
        id: "1",
        name: "翻译",
        parallelSort: 1,
        assigneeId: "u1",
        assigneeNickname: "阿岚",
      }),
      instance({ id: "3", name: "校对", sort: 2, assigneeId: "u3", assigneeNickname: "阿禾" }),
    ];

    expect(buildParticipantRoster(instances)).toBe(["翻译：阿岚、小K", "校对：阿禾"].join("\n\n"));
  });

  test("并行同名任务的同一参与者标注数量", () => {
    const instances = [
      instance({
        id: "2",
        name: "翻译",
        parallelSort: 2,
        assigneeId: "u1",
        assigneeNickname: " 阿岚 ",
      }),
      instance({
        id: "1",
        name: "翻译",
        parallelSort: 1,
        assigneeId: "u1",
        assigneeNickname: "阿岚",
      }),
      instance({ id: "3", name: "校对", sort: 2, assigneeId: "u2", assigneeNickname: "小K" }),
    ];

    expect(buildParticipantRoster(instances)).toBe(["翻译：阿岚×2", "校对：小K"].join("\n\n"));
  });
});
