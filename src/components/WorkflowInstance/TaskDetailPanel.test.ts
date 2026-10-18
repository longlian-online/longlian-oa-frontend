import { describe, expect, test } from "vite-plus/test";

import type { TaskInstanceDetailVO, TaskSubmissionVersionVO } from "@/types/workflowInstance";
import {
  currentVersionOf,
  submissionVersionAuthorLine,
  versionFromDetail,
} from "./TaskDetailPanel";

function detail(
  submission: TaskInstanceDetailVO["submission"],
  assignee?: TaskInstanceDetailVO["task"]["assignee"],
): TaskInstanceDetailVO {
  return {
    task: {
      id: "task-1",
      name: "翻译",
      stage: 1,
      status: "COMPLETED",
      assignee,
    },
    submission,
  };
}

describe("submissionVersionAuthorLine", () => {
  test("版本接口的 submitter 昵称显示在提交时间前", () => {
    const version: TaskSubmissionVersionVO = {
      versionNo: 2,
      status: "SUBMITTED",
      submittedAt: "2026-10-13 20:14:49",
      submitter: { id: "user-2", nickname: "小K" },
      fields: [],
      unreadable: false,
    };

    expect(submissionVersionAuthorLine(version)).toBe("小K · 2026-10-13 20:14:49");
  });

  test("没有提交人或提交时间时使用兜底文案", () => {
    expect(
      submissionVersionAuthorLine({
        submitter: { id: "user-2", nickname: null },
        submittedAt: null,
      }),
    ).toBe("未知 · 时间未知");
  });

  test("详情占位版本使用当前执行人作为提交人", () => {
    const [version] = versionFromDetail(
      detail(
        {
          state: "submitted",
          submittedAt: "2026-10-13 20:14:49",
          fields: [],
        },
        { id: "user-1", nickname: "阿岚" },
      ),
    );

    expect(version?.submitter?.nickname).toBe("阿岚");
    expect(submissionVersionAuthorLine(version!)).toBe("阿岚 · 2026-10-13 20:14:49");
  });

  test("未提交时不生成占位版本", () => {
    expect(versionFromDetail(detail({ state: "not_submitted", fields: [] }))).toEqual([]);
  });
});

describe("currentVersionOf", () => {
  const reset: TaskSubmissionVersionVO = {
    versionNo: 1,
    status: "RESET",
    fields: [],
    unreadable: false,
  };
  const rejected: TaskSubmissionVersionVO = { ...reset, versionNo: 2, status: "REJECTED" };
  const submitted: TaskSubmissionVersionVO = { ...reset, versionNo: 3, status: "SUBMITTED" };

  test("未提交时重置和打回历史都不是当前版本", () => {
    expect(currentVersionOf("not_submitted", [reset])).toBeNull();
    expect(currentVersionOf("not_submitted", [rejected, reset])).toBeNull();
  });

  test("详情未提交时不采用历史接口中的有效提交", () => {
    expect(currentVersionOf("not_submitted", [submitted, reset])).toBeNull();
  });

  test("重新提交后只选择有效提交而不是失效历史", () => {
    expect(currentVersionOf("submitted", [submitted, rejected, reset])).toBe(submitted);
  });

  test("没有有效提交版本时当前版本为空", () => {
    expect(currentVersionOf("submitted", [rejected, reset])).toBeNull();
    expect(currentVersionOf("submitted", [])).toBeNull();
  });
});
